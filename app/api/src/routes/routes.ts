// ============================================
// WAYFIND API - ROUTE ROUTES (Navigation Routes)
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware, venueAdminMiddleware } from '../middleware/auth';

const router = Router();

const createRouteSchema = z.object({
  venueId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  floor: z.string().optional(),
  building: z.string().optional(),
  estimatedTime: z.number().min(0), // seconds
  distance: z.number().min(0), // meters
  difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING']).default('EASY'),
  wheelchairOk: z.boolean().default(false),
  hasElevator: z.boolean().default(false),
  hasStairs: z.boolean().default(false),
  hasRamps: z.boolean().default(false),
  audioGuidance: z.boolean().default(true),
  hapticFeedback: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

// GET /routes - List routes
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = z.object({
      venueId: z.string().optional(),
      difficulty: z.enum(['EASY', 'MODERATE', 'CHALLENGING']).optional(),
      wheelchairOk: z.coerce.boolean().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query);
    
    const where: any = {};
    if (query.venueId) where.venueId = query.venueId;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.wheelchairOk) where.wheelchairOk = query.wheelchairOk;
    
    const [routes, total] = await Promise.all([
      db.route.findMany({
        where,
        include: {
          venue: { select: { id: true, name: true, type: true } },
          _count: { select: { videos: true } },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.route.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: routes,
      meta: { page: query.page, limit: query.limit, total, hasMore: query.page * query.limit < total },
    });
  } catch (error) {
    logger.error({ error }, 'List routes failed');
    res.status(400).json({ success: false, error: { code: 'LIST_FAILED', message: 'Failed to list routes' } });
  }
});

// GET /routes/:id - Get route details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const route = await db.route.findUnique({
      where: { id: req.params.id },
      include: {
        venue: true,
        videos: {
          where: { status: 'PUBLISHED' },
          include: {
            creator: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { avgRating: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!route) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    }
    
    res.json({ success: true, data: route });
  } catch (error) {
    logger.error({ error }, 'Get route failed');
    res.status(500).json({ success: false, error: { code: 'GET_FAILED', message: 'Failed to get route' } });
  }
});

// POST /routes - Create route
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createRouteSchema.parse(req.body);
    
    // Verify venue exists
    const venue = await db.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) {
      return res.status(404).json({ success: false, error: { code: 'VENUE_NOT_FOUND', message: 'Venue not found' } });
    }
    
    const route = await db.route.create({ data });
    
    // Update venue route count
    await db.venue.update({
      where: { id: data.venueId },
      data: { totalRoutes: { increment: 1 } },
    });
    
    logger.info({ routeId: route.id }, 'Route created');
    res.status(201).json({ success: true, data: route });
  } catch (error) {
    logger.error({ error }, 'Create route failed');
    res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create route' } });
  }
});

// PATCH /routes/:id - Update route
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createRouteSchema.partial().omit({ venueId: true }).parse(req.body);
    const route = await db.route.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: route });
  } catch (error) {
    logger.error({ error }, 'Update route failed');
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update route' } });
  }
});

// DELETE /routes/:id - Delete route
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const route = await db.route.findUnique({ where: { id: req.params.id } });
    if (!route) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    }
    
    await db.route.delete({ where: { id: req.params.id } });
    
    await db.venue.update({
      where: { id: route.venueId },
      data: { totalRoutes: { decrement: 1 } },
    });
    
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error({ error }, 'Delete route failed');
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete route' } });
  }
});

export default router;
