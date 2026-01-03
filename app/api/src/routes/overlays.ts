// ============================================
// WAYFIND API - OVERLAY ROUTES
// Core of Creator Studio functionality
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

const translatedTextSchema = z.record(z.string(), z.string().optional());

const positionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().min(0.1).max(3).default(1),
  rotation: z.number().min(-360).max(360).default(0),
});

const timingSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  fadeIn: z.number().min(0).max(2000).default(200),
  fadeOut: z.number().min(0).max(2000).default(200),
});

const styleSchema = z.object({
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  fontWeight: z.enum(['normal', 'medium', 'bold']).optional(),
  shadow: z.boolean().optional(),
  glow: z.boolean().optional(),
  glowColor: z.string().optional(),
}).optional();

const arrowDirections = [
  'straight', 'left', 'right', 'slight-left', 'slight-right',
  'u-turn', 'up-stairs', 'down-stairs', 'elevator', 'escalator'
] as const;

const hapticPatterns = [
  'turn-left', 'turn-right', 'straight', 'arrived', 'warning', 'attention'
] as const;

// Create overlay schema - supports all overlay types
const createOverlaySchema = z.object({
  videoId: z.string(),
  type: z.enum(['ARROW', 'TEXT', 'AD', 'LANDMARK', 'WARNING', 'DESTINATION']),
  
  // Position & timing
  position: positionSchema,
  timing: timingSchema,
  style: styleSchema,
  
  // Accessibility
  haptic: z.enum(hapticPatterns).optional(),
  ttsContent: translatedTextSchema.optional(),
  ariaLabel: translatedTextSchema.optional(),
  
  // Type-specific fields
  // ARROW
  direction: z.enum(arrowDirections).optional(),
  distance: z.number().min(0).optional(),
  
  // TEXT, LANDMARK, WARNING, DESTINATION
  content: translatedTextSchema.optional(),
  title: translatedTextSchema.optional(),
  icon: z.string().optional(),
  
  // TEXT specific
  dismissible: z.boolean().optional(),
  autoHide: z.boolean().optional(),
  
  // AD specific
  adId: z.string().optional(),
  advertiserName: z.string().optional(),
  imageUrl: z.string().url().optional(),
  ctaText: translatedTextSchema.optional(),
  ctaUrl: z.string().url().optional(),
  skippable: z.boolean().default(true).optional(),
  skipAfter: z.number().min(0).optional(),
  
  // WARNING specific
  severity: z.enum(['info', 'caution', 'warning', 'danger']).optional(),
  
  // LANDMARK specific
  category: z.enum(['restroom', 'elevator', 'exit', 'info', 'food', 'shop', 'medical', 'custom']).optional(),
  
  // DESTINATION specific
  arrived: z.boolean().optional(),
});

const updateOverlaySchema = createOverlaySchema.partial().omit({ videoId: true });

const bulkCreateSchema = z.object({
  videoId: z.string(),
  overlays: z.array(createOverlaySchema.omit({ videoId: true })),
});

// ============================================
// GET /overlays
// List overlays for a video
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { videoId, type } = z.object({
      videoId: z.string(),
      type: z.enum(['ARROW', 'TEXT', 'AD', 'LANDMARK', 'WARNING', 'DESTINATION']).optional(),
    }).parse(req.query);
    
    const where: any = { videoId };
    if (type) where.type = type;
    
    const overlays = await db.overlay.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
    
    // Transform to frontend format
    const transformed = overlays.map(overlay => ({
      id: overlay.id,
      type: overlay.type.toLowerCase(),
      position: {
        x: overlay.posX,
        y: overlay.posY,
        scale: overlay.scale,
        rotation: overlay.rotation,
      },
      timing: {
        startTime: overlay.startTime,
        endTime: overlay.endTime,
        fadeIn: overlay.fadeIn,
        fadeOut: overlay.fadeOut,
      },
      style: overlay.style,
      haptic: overlay.haptic,
      ttsContent: overlay.ttsContent,
      ariaLabel: overlay.ariaLabel,
      // Type-specific
      direction: overlay.direction,
      distance: overlay.distance,
      content: overlay.content,
      adId: overlay.adId,
      advertiserName: overlay.advertiserName,
      imageUrl: overlay.imageUrl,
      ctaUrl: overlay.ctaUrl,
      skippable: overlay.skippable,
      skipAfter: overlay.skipAfter,
    }));
    
    res.json({
      success: true,
      data: transformed,
    });
  } catch (error) {
    logger.error({ error }, 'List overlays failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: 'Failed to list overlays',
      },
    });
  }
});

// ============================================
// GET /overlays/:id
// Get single overlay
// ============================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const overlay = await db.overlay.findUnique({
      where: { id: req.params.id },
      include: {
        video: {
          select: { id: true, title: true, creatorId: true },
        },
      },
    });
    
    if (!overlay) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Overlay not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: overlay,
    });
  } catch (error) {
    logger.error({ error }, 'Get overlay failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: 'Failed to get overlay',
      },
    });
  }
});

// ============================================
// POST /overlays
// Create a new overlay
// ============================================

router.post('/', authMiddleware, creatorMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createOverlaySchema.parse(req.body);
    
    // Verify video exists and user owns it
    const video = await db.video.findUnique({
      where: { id: data.videoId },
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only add overlays to your own videos',
        },
      });
    }
    
    // Validate timing
    if (data.timing.endTime <= data.timing.startTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIMING',
          message: 'End time must be after start time',
        },
      });
    }
    
    const overlay = await db.overlay.create({
      data: {
        videoId: data.videoId,
        type: data.type,
        posX: data.position.x,
        posY: data.position.y,
        scale: data.position.scale ?? 1,
        rotation: data.position.rotation ?? 0,
        startTime: data.timing.startTime,
        endTime: data.timing.endTime,
        fadeIn: data.timing.fadeIn ?? 200,
        fadeOut: data.timing.fadeOut ?? 200,
        style: data.style ?? {},
        haptic: data.haptic,
        ttsContent: data.ttsContent ?? {},
        ariaLabel: data.ariaLabel ?? {},
        // Type-specific
        direction: data.direction,
        distance: data.distance,
        content: data.content ?? {},
        adId: data.adId,
        advertiserName: data.advertiserName,
        imageUrl: data.imageUrl,
        ctaUrl: data.ctaUrl,
        skippable: data.skippable,
        skipAfter: data.skipAfter,
      },
    });
    
    logger.info({ overlayId: overlay.id, videoId: data.videoId }, 'Overlay created');
    
    res.status(201).json({
      success: true,
      data: overlay,
    });
  } catch (error) {
    logger.error({ error }, 'Create overlay failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to create overlay',
      },
    });
  }
});

// ============================================
// POST /overlays/bulk
// Create multiple overlays at once
// ============================================

router.post('/bulk', authMiddleware, creatorMiddleware, async (req: Request, res: Response) => {
  try {
    const { videoId, overlays } = bulkCreateSchema.parse(req.body);
    
    // Verify video exists and user owns it
    const video = await db.video.findUnique({
      where: { id: videoId },
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only add overlays to your own videos',
        },
      });
    }
    
    // Create all overlays in a transaction
    const created = await db.$transaction(
      overlays.map(overlay => 
        db.overlay.create({
          data: {
            videoId,
            type: overlay.type,
            posX: overlay.position.x,
            posY: overlay.position.y,
            scale: overlay.position.scale ?? 1,
            rotation: overlay.position.rotation ?? 0,
            startTime: overlay.timing.startTime,
            endTime: overlay.timing.endTime,
            fadeIn: overlay.timing.fadeIn ?? 200,
            fadeOut: overlay.timing.fadeOut ?? 200,
            style: overlay.style ?? {},
            haptic: overlay.haptic,
            ttsContent: overlay.ttsContent ?? {},
            ariaLabel: overlay.ariaLabel ?? {},
            direction: overlay.direction,
            distance: overlay.distance,
            content: overlay.content ?? {},
            adId: overlay.adId,
            advertiserName: overlay.advertiserName,
            imageUrl: overlay.imageUrl,
            ctaUrl: overlay.ctaUrl,
            skippable: overlay.skippable,
            skipAfter: overlay.skipAfter,
          },
        })
      )
    );
    
    logger.info({ videoId, count: created.length }, 'Bulk overlays created');
    
    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    logger.error({ error }, 'Bulk create overlays failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'BULK_CREATE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to create overlays',
      },
    });
  }
});

// ============================================
// PATCH /overlays/:id
// Update overlay
// ============================================

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = updateOverlaySchema.parse(req.body);
    
    // Get overlay and verify ownership
    const existing = await db.overlay.findUnique({
      where: { id: req.params.id },
      include: { video: { select: { creatorId: true } } },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Overlay not found',
        },
      });
    }
    
    if (existing.video.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update overlays on your own videos',
        },
      });
    }
    
    const updateData: any = {};
    
    if (data.position) {
      updateData.posX = data.position.x;
      updateData.posY = data.position.y;
      if (data.position.scale !== undefined) updateData.scale = data.position.scale;
      if (data.position.rotation !== undefined) updateData.rotation = data.position.rotation;
    }
    
    if (data.timing) {
      updateData.startTime = data.timing.startTime;
      updateData.endTime = data.timing.endTime;
      if (data.timing.fadeIn !== undefined) updateData.fadeIn = data.timing.fadeIn;
      if (data.timing.fadeOut !== undefined) updateData.fadeOut = data.timing.fadeOut;
    }
    
    if (data.style !== undefined) updateData.style = data.style;
    if (data.haptic !== undefined) updateData.haptic = data.haptic;
    if (data.ttsContent !== undefined) updateData.ttsContent = data.ttsContent;
    if (data.ariaLabel !== undefined) updateData.ariaLabel = data.ariaLabel;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.direction !== undefined) updateData.direction = data.direction;
    if (data.distance !== undefined) updateData.distance = data.distance;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.adId !== undefined) updateData.adId = data.adId;
    if (data.advertiserName !== undefined) updateData.advertiserName = data.advertiserName;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.ctaUrl !== undefined) updateData.ctaUrl = data.ctaUrl;
    if (data.skippable !== undefined) updateData.skippable = data.skippable;
    if (data.skipAfter !== undefined) updateData.skipAfter = data.skipAfter;
    
    const overlay = await db.overlay.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    logger.info({ overlayId: overlay.id }, 'Overlay updated');
    
    res.json({
      success: true,
      data: overlay,
    });
  } catch (error) {
    logger.error({ error }, 'Update overlay failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to update overlay',
      },
    });
  }
});

// ============================================
// DELETE /overlays/:id
// Delete overlay
// ============================================

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await db.overlay.findUnique({
      where: { id: req.params.id },
      include: { video: { select: { creatorId: true } } },
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Overlay not found',
        },
      });
    }
    
    if (existing.video.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete overlays on your own videos',
        },
      });
    }
    
    await db.overlay.delete({
      where: { id: req.params.id },
    });
    
    logger.info({ overlayId: req.params.id }, 'Overlay deleted');
    
    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error({ error }, 'Delete overlay failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete overlay',
      },
    });
  }
});

// ============================================
// DELETE /overlays/video/:videoId
// Delete all overlays for a video
// ============================================

router.delete('/video/:videoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const video = await db.video.findUnique({
      where: { id: req.params.videoId },
    });
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: 'Video not found',
        },
      });
    }
    
    if (video.creatorId !== req.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete overlays on your own videos',
        },
      });
    }
    
    const result = await db.overlay.deleteMany({
      where: { videoId: req.params.videoId },
    });
    
    logger.info({ videoId: req.params.videoId, count: result.count }, 'All overlays deleted');
    
    res.json({
      success: true,
      data: { deleted: result.count },
    });
  } catch (error) {
    logger.error({ error }, 'Delete all overlays failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete overlays',
      },
    });
  }
});

export default router;
