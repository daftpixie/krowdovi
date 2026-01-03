// ============================================
// WAYFIND API - SESSION ROUTES
// Navigation session tracking
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

const createSessionSchema = z.object({
  videoId: z.string(),
  accessMethod: z.enum(['NFC', 'QR', 'LINK', 'APP']),
  platform: z.string(),
  browser: z.string().optional(),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
  hasMotion: z.boolean().default(false),
  hasHaptics: z.boolean().default(false),
  hasTts: z.boolean().default(false),
});

const updateSessionSchema = z.object({
  completionPercent: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

// POST /sessions - Start navigation session
router.post('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createSessionSchema.parse(req.body);
    
    // Get video to find venue
    const video = await db.video.findUnique({
      where: { id: data.videoId },
      select: { venueId: true },
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: { code: 'VIDEO_NOT_FOUND', message: 'Video not found' } });
    }
    
    const session = await db.navigationSession.create({
      data: {
        userId: req.userId || null,
        videoId: data.videoId,
        venueId: video.venueId,
        accessMethod: data.accessMethod,
        platform: data.platform,
        browser: data.browser,
        appVersion: data.appVersion,
        osVersion: data.osVersion,
        deviceModel: data.deviceModel,
        screenWidth: data.screenWidth,
        screenHeight: data.screenHeight,
        hasMotion: data.hasMotion,
        hasHaptics: data.hasHaptics,
        hasTts: data.hasTts,
      },
    });
    
    logger.info({ sessionId: session.id, videoId: data.videoId }, 'Navigation session started');
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    logger.error({ error }, 'Create session failed');
    res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create session' } });
  }
});

// PATCH /sessions/:id - Update session progress
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = updateSessionSchema.parse(req.body);
    
    const updateData: any = { ...data };
    if (data.completed) {
      updateData.endedAt = new Date();
    }
    
    const session = await db.navigationSession.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    // If completed, update video stats
    if (data.completed) {
      await db.video.update({
        where: { id: session.videoId },
        data: { completions: { increment: 1 } },
      });
      
      // Recalculate average completion
      const stats = await db.navigationSession.aggregate({
        where: { videoId: session.videoId },
        _avg: { completionPercent: true },
      });
      
      await db.video.update({
        where: { id: session.videoId },
        data: { avgCompletion: stats._avg.completionPercent || 0 },
      });
    }
    
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error({ error }, 'Update session failed');
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update session' } });
  }
});

// POST /sessions/:id/end - End session
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const { completionPercent } = z.object({
      completionPercent: z.number().min(0).max(100),
    }).parse(req.body);
    
    const session = await db.navigationSession.update({
      where: { id: req.params.id },
      data: {
        endedAt: new Date(),
        completionPercent,
        completed: completionPercent >= 90,
      },
    });
    
    // Update video stats if completed
    if (completionPercent >= 90) {
      await db.video.update({
        where: { id: session.videoId },
        data: { completions: { increment: 1 } },
      });
    }
    
    logger.info({ sessionId: session.id, completionPercent }, 'Navigation session ended');
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error({ error }, 'End session failed');
    res.status(400).json({ success: false, error: { code: 'END_FAILED', message: 'Failed to end session' } });
  }
});

// Track NFC/QR scans
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { type, id } = z.object({
      type: z.enum(['nfc', 'qr']),
      id: z.string(),
    }).parse(req.body);
    
    if (type === 'nfc') {
      await db.nfcTag.update({
        where: { id },
        data: {
          scanCount: { increment: 1 },
          lastScanned: new Date(),
        },
      });
    } else {
      await db.qrCode.update({
        where: { id },
        data: { scanCount: { increment: 1 } },
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Track scan failed');
    res.status(400).json({ success: false, error: { code: 'SCAN_FAILED', message: 'Failed to track scan' } });
  }
});

export default router;
