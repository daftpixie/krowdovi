// ============================================
// WAYFIND API - UPLOAD ROUTES
// Cloudflare Stream integration
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { authMiddleware, creatorMiddleware } from '../middleware/auth';

const router = Router();

// Cloudflare Stream API base
const CF_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${config.cloudflare.accountId}/stream`;

// POST /uploads/direct - Get direct upload URL
router.post('/direct', authMiddleware, creatorMiddleware, async (req: Request, res: Response) => {
  try {
    const { videoId, maxDurationSeconds } = z.object({
      videoId: z.string(),
      maxDurationSeconds: z.number().min(10).max(600).default(300),
    }).parse(req.body);
    
    // Verify video exists and user owns it
    const video = await db.video.findUnique({
      where: { id: videoId },
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: { code: 'VIDEO_NOT_FOUND', message: 'Video not found' } });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }
    
    // Request direct upload URL from Cloudflare
    const response = await fetch(`${CF_API_BASE}/direct_upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cloudflare.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds,
        expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
        meta: {
          videoId,
          creatorId: req.userId,
        },
        requireSignedURLs: false,
        allowedOrigins: config.corsOrigins,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      logger.error({ cfError: data.errors }, 'Cloudflare direct upload failed');
      return res.status(500).json({ success: false, error: { code: 'CF_ERROR', message: 'Failed to get upload URL' } });
    }
    
    // Update video with stream ID
    await db.video.update({
      where: { id: videoId },
      data: {
        cfStreamId: data.result.uid,
        status: 'PROCESSING',
      },
    });
    
    logger.info({ videoId, streamId: data.result.uid }, 'Direct upload URL generated');
    
    res.json({
      success: true,
      data: {
        uploadURL: data.result.uploadURL,
        streamId: data.result.uid,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get upload URL failed');
    res.status(500).json({ success: false, error: { code: 'UPLOAD_FAILED', message: 'Failed to get upload URL' } });
  }
});

// POST /uploads/webhook - Cloudflare Stream webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature in production
    const event = req.body;
    
    logger.info({ event }, 'Cloudflare webhook received');
    
    if (event.type === 'video.ready') {
      const streamId = event.data.uid;
      
      // Find video by stream ID
      const video = await db.video.findFirst({
        where: { cfStreamId: streamId },
      });
      
      if (video) {
        await db.video.update({
          where: { id: video.id },
          data: {
            status: 'DRAFT', // Ready for editing
            duration: event.data.duration,
            width: event.data.input?.width || 1080,
            height: event.data.input?.height || 1920,
            hlsUrl: `https://customer-${config.cloudflare.accountId}.cloudflarestream.com/${streamId}/manifest/video.m3u8`,
            thumbnailUrl: `https://customer-${config.cloudflare.accountId}.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg`,
            cfPlaybackId: event.data.playback?.hls,
          },
        });
        
        logger.info({ videoId: video.id, streamId }, 'Video processing complete');
      }
    } else if (event.type === 'video.error') {
      const streamId = event.data.uid;
      
      const video = await db.video.findFirst({
        where: { cfStreamId: streamId },
      });
      
      if (video) {
        await db.video.update({
          where: { id: video.id },
          data: { status: 'REJECTED' },
        });
        
        logger.error({ videoId: video.id, streamId, error: event.data }, 'Video processing failed');
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error({ error }, 'Webhook processing failed');
    res.status(500).json({ error: 'Webhook failed' });
  }
});

// GET /uploads/:streamId/status - Check upload status
router.get('/:streamId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${CF_API_BASE}/${req.params.streamId}`, {
      headers: {
        'Authorization': `Bearer ${config.cloudflare.apiToken}`,
      },
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stream not found' } });
    }
    
    res.json({
      success: true,
      data: {
        status: data.result.status,
        duration: data.result.duration,
        readyToStream: data.result.readyToStream,
        thumbnail: data.result.thumbnail,
        playback: data.result.playback,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get status failed');
    res.status(500).json({ success: false, error: { code: 'STATUS_FAILED', message: 'Failed to get status' } });
  }
});

// DELETE /uploads/:streamId - Delete from Cloudflare
router.delete('/:streamId', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Verify ownership
    const video = await db.video.findFirst({
      where: { cfStreamId: req.params.streamId },
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }
    
    await fetch(`${CF_API_BASE}/${req.params.streamId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${config.cloudflare.apiToken}`,
      },
    });
    
    logger.info({ streamId: req.params.streamId }, 'Stream deleted from Cloudflare');
    
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error({ error }, 'Delete stream failed');
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete' } });
  }
});

export default router;
