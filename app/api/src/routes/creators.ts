// ============================================
// WAYFIND API - CREATOR ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /creators - List creators
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = z.object({
      tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']).optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sortBy: z.enum(['reputation', 'videos', 'earnings']).default('reputation'),
    }).parse(req.query);
    
    const creators = await db.user.findMany({
      where: { role: 'CREATOR' },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        _count: { select: { videos: true } },
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    
    // Get reputations
    const reputations = await db.creatorReputation.findMany({
      where: { userId: { in: creators.map(c => c.id) } },
    });
    
    const repMap = new Map(reputations.map(r => [r.userId, r]));
    
    const result = creators.map(c => ({
      ...c,
      reputation: repMap.get(c.id) || null,
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'List creators failed');
    res.status(400).json({ success: false, error: { code: 'LIST_FAILED', message: 'Failed to list creators' } });
  }
});

// GET /creators/:id - Get creator profile
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const creator = await db.user.findUnique({
      where: { id: req.params.id, role: 'CREATOR' },
      include: {
        videos: {
          where: { status: 'PUBLISHED' },
          orderBy: { avgRating: 'desc' },
          take: 10,
          include: {
            venue: { select: { id: true, name: true } },
          },
        },
      },
    });
    
    if (!creator) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creator not found' } });
    }
    
    const reputation = await db.creatorReputation.findUnique({
      where: { userId: creator.id },
    });
    
    // Calculate stats
    const stats = await db.video.aggregate({
      where: { creatorId: creator.id, status: 'PUBLISHED' },
      _sum: { views: true, completions: true },
      _avg: { avgRating: true },
      _count: true,
    });
    
    res.json({
      success: true,
      data: {
        ...creator,
        reputation,
        stats: {
          totalVideos: stats._count,
          totalViews: stats._sum.views || 0,
          totalCompletions: stats._sum.completions || 0,
          avgRating: stats._avg.avgRating || 0,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get creator failed');
    res.status(500).json({ success: false, error: { code: 'GET_FAILED', message: 'Failed to get creator' } });
  }
});

// POST /creators/become - Become a creator
router.post('/become', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bio, payoutAddress } = z.object({
      bio: z.string().max(500).optional(),
      payoutAddress: z.string().min(32).max(44),
    }).parse(req.body);
    
    const user = await db.user.update({
      where: { id: req.userId },
      data: {
        role: 'CREATOR',
        bio,
        payoutAddress,
      },
    });
    
    // Create initial reputation
    await db.creatorReputation.create({
      data: {
        userId: user.id,
        overall: 50,
        freshness: 50,
        completionRate: 50,
        userRating: 50,
        accessibility: 50,
        noBounce: 50,
        tier: 'SILVER',
        multiplier: 1.0,
      },
    });
    
    logger.info({ userId: user.id }, 'User became creator');
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error({ error }, 'Become creator failed');
    res.status(400).json({ success: false, error: { code: 'BECOME_FAILED', message: 'Failed to become creator' } });
  }
});

// GET /creators/:id/earnings - Get earnings history
router.get('/:id/earnings', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Only allow viewing own earnings
    if (req.params.id !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot view other creators earnings' } });
    }
    
    const rewards = await db.creatorReward.findMany({
      where: { creatorId: req.params.id },
      include: {
        epoch: { select: { weekStarting: true, weekEnding: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 52, // Last year of weeks
    });
    
    const totalEarnings = rewards.reduce((sum, r) => sum + Number(r.finalReward), 0);
    const claimedEarnings = rewards.filter(r => r.claimed).reduce((sum, r) => sum + Number(r.finalReward), 0);
    const pendingEarnings = rewards.filter(r => !r.claimed).reduce((sum, r) => sum + Number(r.finalReward), 0);
    
    res.json({
      success: true,
      data: {
        rewards,
        summary: {
          totalEarnings,
          claimedEarnings,
          pendingEarnings,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get earnings failed');
    res.status(500).json({ success: false, error: { code: 'GET_FAILED', message: 'Failed to get earnings' } });
  }
});

// POST /creators/:id/reputation/recalculate - Recalculate reputation (admin)
router.post('/:id/reputation/recalculate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const creatorId = req.params.id;
    
    // Get video stats
    const videos = await db.video.findMany({
      where: { creatorId, status: 'PUBLISHED' },
      select: {
        id: true,
        avgRating: true,
        avgCompletion: true,
        views: true,
        createdAt: true,
        publishedAt: true,
      },
    });
    
    if (videos.length === 0) {
      return res.json({ success: true, data: { message: 'No videos to calculate reputation' } });
    }
    
    // Calculate scores
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Freshness: % of videos updated in last 30 days
    const recentVideos = videos.filter(v => v.publishedAt && v.publishedAt > thirtyDaysAgo);
    const freshness = Math.min(100, (recentVideos.length / videos.length) * 100 + 20);
    
    // Completion rate: average
    const avgCompletion = videos.reduce((sum, v) => sum + (v.avgCompletion || 0), 0) / videos.length;
    const completionRate = avgCompletion;
    
    // User rating: average * 20 (5-star to 100 scale)
    const avgRating = videos.reduce((sum, v) => sum + (v.avgRating || 0), 0) / videos.length;
    const userRating = avgRating * 20;
    
    // For MVP, set accessibility and noBounce to baseline
    const accessibility = 60; // Would be calculated from overlay analysis
    const noBounce = 70; // Would be calculated from session analytics
    
    // Overall score (weighted)
    const overall = 
      freshness * 0.30 +
      completionRate * 0.25 +
      userRating * 0.25 +
      accessibility * 0.10 +
      noBounce * 0.10;
    
    // Determine tier and multiplier
    let tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
    let multiplier: number;
    
    if (overall >= 95) { tier = 'DIAMOND'; multiplier = 2.5; }
    else if (overall >= 80) { tier = 'PLATINUM'; multiplier = 2.0; }
    else if (overall >= 60) { tier = 'GOLD'; multiplier = 1.5; }
    else if (overall >= 40) { tier = 'SILVER'; multiplier = 1.0; }
    else { tier = 'BRONZE'; multiplier = 0.5; }
    
    const reputation = await db.creatorReputation.upsert({
      where: { userId: creatorId },
      update: {
        overall,
        freshness,
        completionRate,
        userRating,
        accessibility,
        noBounce,
        tier,
        multiplier,
      },
      create: {
        userId: creatorId,
        overall,
        freshness,
        completionRate,
        userRating,
        accessibility,
        noBounce,
        tier,
        multiplier,
      },
    });
    
    logger.info({ creatorId, overall, tier }, 'Reputation recalculated');
    res.json({ success: true, data: reputation });
  } catch (error) {
    logger.error({ error }, 'Recalculate reputation failed');
    res.status(500).json({ success: false, error: { code: 'RECALC_FAILED', message: 'Failed to recalculate reputation' } });
  }
});

export default router;
