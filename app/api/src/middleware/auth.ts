// ============================================
// WAYFIND API - AUTH MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import { config } from '../lib/config';
import { logger } from '../lib/logger';

interface JwtPayload {
  userId: string;
  walletAddress: string;
  role: string;
}

// ============================================
// authMiddleware
// Verify JWT and attach user to request
// ============================================

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication token required',
        },
      });
    }
    
    const token = authHeader.substring(7);
    
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }
    
    // Verify user still exists
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, walletAddress: true, role: true },
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User no longer exists',
        },
      });
    }
    
    // Attach to request
    req.userId = user.id;
    req.walletAddress = user.walletAddress;
    
    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

// ============================================
// creatorMiddleware
// Verify user is a creator
// ============================================

export async function creatorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }
    
    const user = await db.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    
    if (!user || !['CREATOR', 'VENUE_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_CREATOR',
          message: 'Creator access required',
        },
      });
    }
    
    next();
  } catch (error) {
    logger.error({ error }, 'Creator middleware error');
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authorization failed',
      },
    });
  }
}

// ============================================
// venueAdminMiddleware
// Verify user is admin of a specific venue
// ============================================

export function venueAdminMiddleware(venueIdParam: string = 'venueId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required',
          },
        });
      }
      
      const venueId = req.params[venueIdParam] || req.body[venueIdParam];
      
      if (!venueId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VENUE_ID_REQUIRED',
            message: 'Venue ID is required',
          },
        });
      }
      
      // Check if platform admin (can access any venue)
      const user = await db.user.findUnique({
        where: { id: req.userId },
        select: { role: true },
      });
      
      if (user?.role === 'PLATFORM_ADMIN') {
        return next();
      }
      
      // Check venue admin relationship
      const venueAdmin = await db.venueAdmin.findUnique({
        where: {
          userId_venueId: {
            userId: req.userId,
            venueId,
          },
        },
      });
      
      if (!venueAdmin) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NOT_VENUE_ADMIN',
            message: 'Venue admin access required',
          },
        });
      }
      
      next();
    } catch (error) {
      logger.error({ error }, 'Venue admin middleware error');
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authorization failed',
        },
      });
    }
  };
}

// ============================================
// platformAdminMiddleware
// Verify user is platform admin
// ============================================

export async function platformAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }
    
    const user = await db.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    
    if (user?.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_ADMIN',
          message: 'Platform admin access required',
        },
      });
    }
    
    next();
  } catch (error) {
    logger.error({ error }, 'Platform admin middleware error');
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authorization failed',
      },
    });
  }
}

// ============================================
// optionalAuthMiddleware
// Attach user if token present, but don't require it
// ============================================

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.userId = decoded.userId;
      req.walletAddress = decoded.walletAddress;
    } catch {
      // Token invalid, but that's OK - continue without auth
    }
    
    next();
  } catch (error) {
    next();
  }
}
