// ============================================
// WAYFIND API - ADVERTISEMENT ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const createAdSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.record(z.string(), z.string()), // TranslatedText
  imageUrl: z.string().url().optional(),
  ctaText: z.record(z.string(), z.string()).optional(),
  ctaUrl: z.string().url().optional(),
  venueTypes: z.array(z.enum([
    'HOSPITAL', 'AIRPORT', 'MALL', 'UNIVERSITY', 'HOTEL',
    'TRANSIT', 'CORPORATE', 'MUSEUM', 'STADIUM', 'CONVENTION', 'OTHER'
  ])).optional(),
  venueIds: z.array(z.string()).optional(),
  dailyBudget: z.number().min(1),
  totalBudget: z.number().min(1),
  costPerImpression: z.number().min(0.001),
  costPerClick: z.number().min(0.01),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

// GET /ads - List ads (for advertisers)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ads = await db.advertisement.findMany({
      where: { advertiserId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ success: true, data: ads });
  } catch (error) {
    logger.error({ error }, 'List ads failed');
    res.status(500).json({ success: false, error: { code: 'LIST_FAILED', message: 'Failed to list ads' } });
  }
});

// GET /ads/available - Get available ads for a venue (for creators)
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { venueId, venueType } = z.object({
      venueId: z.string().optional(),
      venueType: z.string().optional(),
    }).parse(req.query);
    
    const now = new Date();
    
    const ads = await db.advertisement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
        // Budget not exhausted
        spent: { lt: db.advertisement.fields.totalBudget },
        // Targeting
        ...(venueId && { venueIds: { has: venueId } }),
        ...(venueType && { venueTypes: { has: venueType as any } }),
      },
      select: {
        id: true,
        name: true,
        content: true,
        imageUrl: true,
        ctaText: true,
        ctaUrl: true,
        costPerImpression: true,
        costPerClick: true,
      },
      take: 10,
    });
    
    res.json({ success: true, data: ads });
  } catch (error) {
    logger.error({ error }, 'Get available ads failed');
    res.status(500).json({ success: false, error: { code: 'GET_FAILED', message: 'Failed to get ads' } });
  }
});

// POST /ads - Create ad campaign
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createAdSchema.parse(req.body);
    
    const ad = await db.advertisement.create({
      data: {
        advertiserId: req.userId!,
        ...data,
      },
    });
    
    logger.info({ adId: ad.id }, 'Ad campaign created');
    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    logger.error({ error }, 'Create ad failed');
    res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create ad' } });
  }
});

// POST /ads/:id/impression - Track impression
router.post('/:id/impression', async (req: Request, res: Response) => {
  try {
    const ad = await db.advertisement.findUnique({ where: { id: req.params.id } });
    
    if (!ad) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ad not found' } });
    }
    
    await db.advertisement.update({
      where: { id: req.params.id },
      data: {
        impressions: { increment: 1 },
        spent: { increment: ad.costPerImpression },
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Track impression failed');
    res.status(500).json({ success: false, error: { code: 'TRACK_FAILED', message: 'Failed to track' } });
  }
});

// POST /ads/:id/click - Track click
router.post('/:id/click', async (req: Request, res: Response) => {
  try {
    const ad = await db.advertisement.findUnique({ where: { id: req.params.id } });
    
    if (!ad) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ad not found' } });
    }
    
    await db.advertisement.update({
      where: { id: req.params.id },
      data: {
        clicks: { increment: 1 },
        spent: { increment: ad.costPerClick },
      },
    });
    
    res.json({ success: true, data: { ctaUrl: ad.ctaUrl } });
  } catch (error) {
    logger.error({ error }, 'Track click failed');
    res.status(500).json({ success: false, error: { code: 'TRACK_FAILED', message: 'Failed to track' } });
  }
});

// PATCH /ads/:id - Update ad
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await db.advertisement.findUnique({ where: { id: req.params.id } });
    
    if (!existing || existing.advertiserId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }
    
    const data = createAdSchema.partial().parse(req.body);
    const ad = await db.advertisement.update({ where: { id: req.params.id }, data });
    
    res.json({ success: true, data: ad });
  } catch (error) {
    logger.error({ error }, 'Update ad failed');
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update ad' } });
  }
});

// DELETE /ads/:id - Delete ad
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await db.advertisement.findUnique({ where: { id: req.params.id } });
    
    if (!existing || existing.advertiserId !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } });
    }
    
    await db.advertisement.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error({ error }, 'Delete ad failed');
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete ad' } });
  }
});

export default router;
