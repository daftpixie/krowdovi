// ============================================
// WAYFIND API - ANALYTICS ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware, venueAdminMiddleware } from '../middleware/auth';

const router = Router();

// GET /analytics/venue/:venueId - Venue analytics
router.get('/venue/:venueId', authMiddleware, venueAdminMiddleware('venueId'), async (req: Request, res: Response) => {
  try {
    const { period } = z.object({
      period: z.enum(['day', 'week', 'month', 'year']).default('week'),
    }).parse(req.query);
    
    const now = new Date();
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    const startDate = new Date(now.getTime() - periodMs[period]);
    
    const [sessions, videos, accessMethods, platforms] = await Promise.all([
      db.navigationSession.aggregate({
        where: { venueId: req.params.venueId, startedAt: { gte: startDate } },
        _count: true,
        _avg: { completionPercent: true },
      }),
      db.video.findMany({
        where: { venueId: req.params.venueId, status: 'PUBLISHED' },
        select: { id: true, title: true, views: true, completions: true, avgRating: true },
        orderBy: { views: 'desc' },
        take: 10,
      }),
      db.navigationSession.groupBy({
        by: ['accessMethod'],
        where: { venueId: req.params.venueId, startedAt: { gte: startDate } },
        _count: true,
      }),
      db.navigationSession.groupBy({
        by: ['platform'],
        where: { venueId: req.params.venueId, startedAt: { gte: startDate } },
        _count: true,
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        venueId: req.params.venueId,
        period,
        startDate,
        endDate: now,
        totalSessions: sessions._count,
        avgCompletionRate: sessions._avg.completionPercent || 0,
        topVideos: videos,
        accessMethodBreakdown: Object.fromEntries(accessMethods.map(a => [a.accessMethod, a._count])),
        platformBreakdown: Object.fromEntries(platforms.map(p => [p.platform, p._count])),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Venue analytics failed');
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_FAILED', message: 'Failed to get analytics' } });
  }
});

// GET /analytics/creator/:creatorId - Creator analytics
router.get('/creator/:creatorId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.params.creatorId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Can only view own analytics' } });
    }
    
    const { period } = z.object({
      period: z.enum(['day', 'week', 'month', 'year']).default('week'),
    }).parse(req.query);
    
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    const startDate = new Date(Date.now() - periodMs[period]);
    
    const [stats, videos, rewards] = await Promise.all([
      db.video.aggregate({
        where: { creatorId: req.params.creatorId, status: 'PUBLISHED' },
        _sum: { views: true, completions: true, weeklyViews: true },
        _avg: { avgRating: true },
        _count: true,
      }),
      db.video.findMany({
        where: { creatorId: req.params.creatorId },
        select: { id: true, title: true, views: true, avgRating: true, status: true },
        orderBy: { views: 'desc' },
        take: 10,
      }),
      db.creatorReward.aggregate({
        where: { creatorId: req.params.creatorId },
        _sum: { finalReward: true },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        creatorId: req.params.creatorId,
        period,
        totalVideos: stats._count,
        totalViews: stats._sum.views || 0,
        totalCompletions: stats._sum.completions || 0,
        weeklyViews: stats._sum.weeklyViews || 0,
        avgRating: stats._avg.avgRating || 0,
        totalEarnings: (stats._sum.views || 0n).toString(),
        topVideos: videos,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Creator analytics failed');
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_FAILED', message: 'Failed to get analytics' } });
  }
});

// GET /analytics/video/:videoId - Video analytics
router.get('/video/:videoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const video = await db.video.findUnique({
      where: { id: req.params.videoId },
      include: {
        route: { select: { name: true } },
        venue: { select: { name: true } },
      },
    });
    
    if (!video) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }
    
    const [sessionStats, ratingDist, recentSessions] = await Promise.all([
      db.navigationSession.aggregate({
        where: { videoId: video.id },
        _count: true,
        _avg: { completionPercent: true },
      }),
      db.videoRating.groupBy({
        by: ['rating'],
        where: { videoId: video.id },
        _count: true,
      }),
      db.navigationSession.findMany({
        where: { videoId: video.id },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          startedAt: true,
          completionPercent: true,
          accessMethod: true,
          platform: true,
        },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        video: {
          id: video.id,
          title: video.title,
          route: video.route.name,
          venue: video.venue.name,
          views: video.views,
          completions: video.completions,
          avgCompletion: video.avgCompletion,
          avgRating: video.avgRating,
          totalRatings: video.totalRatings,
        },
        sessionCount: sessionStats._count,
        avgCompletionPercent: sessionStats._avg.completionPercent || 0,
        ratingDistribution: Object.fromEntries(ratingDist.map(r => [r.rating, r._count])),
        recentSessions,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Video analytics failed');
    res.status(500).json({ success: false, error: { code: 'ANALYTICS_FAILED', message: 'Failed to get analytics' } });
  }
});

export default router;
