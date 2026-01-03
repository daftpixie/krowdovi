// ============================================
// WAYFIND API - VIDEO ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware, creatorMiddleware } from '../middleware/auth';

const router = Router();

// ============================================
// SCHEMAS
// ============================================

const createVideoSchema = z.object({
  routeId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  cfStreamId: z.string().optional(),
});

const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const querySchema = z.object({
  venueId: z.string().optional(),
  routeId: z.string().optional(),
  creatorId: z.string().optional(),
  status: z.enum(['DRAFT', 'PROCESSING', 'PUBLISHED', 'ARCHIVED', 'REJECTED']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'views', 'avgRating', 'publishedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// GET /videos
// List videos with filtering
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    
    const where: any = {};
    if (query.venueId) where.venueId = query.venueId;
    if (query.routeId) where.routeId = query.routeId;
    if (query.creatorId) where.creatorId = query.creatorId;
    if (query.status) where.status = query.status;
    
    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        include: {
          route: true,
          venue: { select: { id: true, name: true, type: true } },
          creator: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { overlays: true, ratings: true } },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.video.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: videos,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        hasMore: query.page * query.limit < total,
      },
    });
  } catch (error) {
    logger.error({ error }, 'List videos failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: 'Failed to list videos',
      },
    });
  }
});

// ============================================
// GET /videos/:id
// Get single video with full details
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const video = await db.video.findUnique({
      where: { id: req.params.id },
      include: {
        route: true,
        venue: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
          },
        },
        overlays: {
          orderBy: { startTime: 'asc' },
        },
      },
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    // Increment view count (async, don't wait)
    db.video.update({
      where: { id: video.id },
      data: { 
        views: { increment: 1 },
        weeklyViews: { increment: 1 },
        monthlyViews: { increment: 1 },
      },
    }).catch(() => {}); // Fire and forget
    
    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    logger.error({ error }, 'Get video failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: 'Failed to get video',
      },
    });
  }
});

// ============================================
// POST /videos
// Create a new video (creator only)
// ============================================

router.post('/', authMiddleware, creatorMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createVideoSchema.parse(req.body);
    
    // Verify route exists and get venue
    const route = await db.route.findUnique({
      where: { id: data.routeId },
      include: { venue: true },
    });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'Route not found',
        },
      });
    }
    
    const video = await db.video.create({
      data: {
        routeId: data.routeId,
        venueId: route.venueId,
        creatorId: req.userId!,
        title: data.title,
        description: data.description,
        cfStreamId: data.cfStreamId,
        status: 'DRAFT',
        duration: 0,
        width: 1080,
        height: 1920,
        fps: 30,
        fileSize: 0,
      },
      include: {
        route: true,
        venue: { select: { id: true, name: true } },
      },
    });
    
    logger.info({ videoId: video.id, creatorId: req.userId }, 'Video created');
    
    res.status(201).json({
      success: true,
      data: video,
    });
  } catch (error) {
    logger.error({ error }, 'Create video failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to create video',
      },
    });
  }
});

// ============================================
// PATCH /videos/:id
// Update video (owner only)
// ============================================

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = updateVideoSchema.parse(req.body);
    
    const existing = await db.video.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    if (existing.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own videos',
        },
      });
    }
    
    const updateData: any = { ...data };
    if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }
    
    const video = await db.video.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        route: true,
        venue: { select: { id: true, name: true } },
        overlays: true,
      },
    });
    
    // Update venue video count if publishing
    if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      await db.venue.update({
        where: { id: video.venueId },
        data: { totalVideos: { increment: 1 } },
      });
    }
    
    logger.info({ videoId: video.id }, 'Video updated');
    
    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    logger.error({ error }, 'Update video failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to update video',
      },
    });
  }
});

// ============================================
// DELETE /videos/:id
// Delete video (owner only)
// ============================================

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await db.video.findUnique({
      where: { id: req.params.id },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    if (existing.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own videos',
        },
      });
    }
    
    await db.video.delete({
      where: { id: req.params.id },
    });
    
    // Update venue count if was published
    if (existing.status === 'PUBLISHED') {
      await db.venue.update({
        where: { id: existing.venueId },
        data: { totalVideos: { decrement: 1 } },
      });
    }
    
    logger.info({ videoId: req.params.id }, 'Video deleted');
    
    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error({ error }, 'Delete video failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete video',
      },
    });
  }
});

// ============================================
// POST /videos/:id/rate
// Rate a video
// ============================================

router.post('/:id/rate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { rating, feedback } = z.object({
      rating: z.number().min(1).max(5),
      feedback: z.string().max(1000).optional(),
    }).parse(req.body);
    
    const video = await db.video.findUnique({
      where: { id: req.params.id },
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    // Upsert rating
    const videoRating = await db.videoRating.upsert({
      where: {
        videoId_userId: {
          videoId: req.params.id,
          userId: req.userId!,
        },
      },
      create: {
        videoId: req.params.id,
        userId: req.userId!,
        rating,
        feedback,
      },
      update: {
        rating,
        feedback,
      },
    });
    
    // Recalculate average rating
    const stats = await db.videoRating.aggregate({
      where: { videoId: req.params.id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    
    await db.video.update({
      where: { id: req.params.id },
      data: {
        avgRating: stats._avg.rating || 0,
        totalRatings: stats._count.rating,
      },
    });
    
    res.json({
      success: true,
      data: videoRating,
    });
  } catch (error) {
    logger.error({ error }, 'Rate video failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'RATE_FAILED',
        message: 'Failed to rate video',
      },
    });
  }
});

export default router;
