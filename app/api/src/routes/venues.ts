// ============================================
// WAYFIND API - VENUE ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { authMiddleware, venueAdminMiddleware } from '../middleware/auth';

const router = Router();

const venueTypes = [
  'HOSPITAL', 'AIRPORT', 'MALL', 'UNIVERSITY', 'HOTEL',
  'TRANSIT', 'CORPORATE', 'MUSEUM', 'STADIUM', 'CONVENTION', 'OTHER'
] as const;

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(venueTypes),
  description: z.string().max(2000).optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().min(1),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().default('UTC'),
  logoUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  floors: z.array(z.string()).default([]),
  buildings: z.array(z.string()).default([]),
});

// GET /venues - List venues
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = z.object({
      type: z.enum(venueTypes).optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      bountyActive: z.coerce.boolean().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }).parse(req.query);
    
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country) where.country = query.country;
    if (query.bountyActive !== undefined) where.bountyActive = query.bountyActive;
    
    const [venues, total] = await Promise.all([
      db.venue.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.venue.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: venues,
      meta: { page: query.page, limit: query.limit, total, hasMore: query.page * query.limit < total },
    });
  } catch (error) {
    logger.error({ error }, 'List venues failed');
    res.status(400).json({ success: false, error: { code: 'LIST_FAILED', message: 'Failed to list venues' } });
  }
});

// GET /venues/:id - Get venue details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const venue = await db.venue.findUnique({
      where: { id: req.params.id },
      include: {
        routes: { where: { videos: { some: { status: 'PUBLISHED' } } } },
        _count: { select: { videos: true, routes: true } },
      },
    });
    
    if (!venue) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Venue not found' } });
    }
    
    res.json({ success: true, data: venue });
  } catch (error) {
    logger.error({ error }, 'Get venue failed');
    res.status(500).json({ success: false, error: { code: 'GET_FAILED', message: 'Failed to get venue' } });
  }
});

// POST /venues - Create venue
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createVenueSchema.parse(req.body);
    
    const venue = await db.venue.create({ data });
    
    // Make creator an admin of the venue
    await db.venueAdmin.create({
      data: { userId: req.userId!, venueId: venue.id },
    });
    
    logger.info({ venueId: venue.id }, 'Venue created');
    res.status(201).json({ success: true, data: venue });
  } catch (error) {
    logger.error({ error }, 'Create venue failed');
    res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create venue' } });
  }
});

// PATCH /venues/:id - Update venue
router.patch('/:id', authMiddleware, venueAdminMiddleware('id'), async (req: Request, res: Response) => {
  try {
    const data = createVenueSchema.partial().parse(req.body);
    const venue = await db.venue.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: venue });
  } catch (error) {
    logger.error({ error }, 'Update venue failed');
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update venue' } });
  }
});

// POST /venues/:id/bounty - Set bounty for venue
router.post('/:id/bounty', authMiddleware, venueAdminMiddleware('id'), async (req: Request, res: Response) => {
  try {
    const { amount, routes } = z.object({
      amount: z.number().min(0),
      routes: z.array(z.string()).optional(),
    }).parse(req.body);
    
    const venue = await db.venue.update({
      where: { id: req.params.id },
      data: {
        bountyActive: amount > 0,
        bountyAmount: amount,
        bountyRoutes: routes || [],
      },
    });
    
    res.json({ success: true, data: venue });
  } catch (error) {
    logger.error({ error }, 'Set bounty failed');
    res.status(400).json({ success: false, error: { code: 'BOUNTY_FAILED', message: 'Failed to set bounty' } });
  }
});

export default router;
