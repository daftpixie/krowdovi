// ============================================
// WAYFIND API - AUTH ROUTES
// ============================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { db } from '../lib/db';
import { config } from '../lib/config';
import { logger } from '../lib/logger';

const router = Router();

// Challenge store (in production, use Redis with TTL)
const challenges = new Map<string, { nonce: string; expiresAt: number }>();

// ============================================
// SCHEMAS
// ============================================

const challengeSchema = z.object({
  walletAddress: z.string().min(32).max(44),
});

const verifySchema = z.object({
  walletAddress: z.string().min(32).max(44),
  signature: z.string(),
  message: z.string(),
});

// ============================================
// GET /auth/challenge
// Generate a nonce for wallet signature
// ============================================

router.post('/challenge', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = challengeSchema.parse(req.body);
    
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    challenges.set(walletAddress, { nonce, expiresAt });
    
    const message = `Sign this message to access Wayfind.\n\nNonce: ${nonce}\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}`;
    
    res.json({
      success: true,
      data: {
        message,
        nonce,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Challenge generation failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'CHALLENGE_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to generate challenge',
      },
    });
  }
});

// ============================================
// POST /auth/verify
// Verify wallet signature and issue JWT
// ============================================

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = verifySchema.parse(req.body);
    
    // Check challenge exists and is valid
    const challenge = challenges.get(walletAddress);
    if (!challenge) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_CHALLENGE',
          message: 'No active challenge found. Request a new one.',
        },
      });
    }
    
    if (Date.now() > challenge.expiresAt) {
      challenges.delete(walletAddress);
      return res.status(401).json({
        success: false,
        error: {
          code: 'CHALLENGE_EXPIRED',
          message: 'Challenge has expired. Request a new one.',
        },
      });
    }
    
    // Verify the message contains our nonce
    if (!message.includes(challenge.nonce)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Message does not contain the expected nonce.',
        },
      });
    }
    
    // Verify Solana signature
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);
      
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Signature verification failed.',
          },
        });
      }
    } catch (verifyError) {
      logger.error({ verifyError }, 'Signature verification error');
      return res.status(401).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: 'Failed to verify signature.',
        },
      });
    }
    
    // Clear challenge
    challenges.delete(walletAddress);
    
    // Find or create user
    let user = await db.user.findUnique({
      where: { walletAddress },
    });
    
    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress,
          role: 'USER',
        },
      });
      logger.info({ walletAddress }, 'New user created');
    }
    
    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    
    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Verification failed');
    res.status(400).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: error instanceof z.ZodError 
          ? error.errors[0].message 
          : 'Failed to verify signature',
      },
    });
  }
});

// ============================================
// GET /auth/me
// Get current user from token
// ============================================

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided',
        },
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      walletAddress: string;
      role: string;
    };
    
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        venueAdmin: {
          include: { venue: true },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }
    
    // Get reputation if creator
    let reputation = null;
    if (user.role === 'CREATOR') {
      reputation = await db.creatorReputation.findUnique({
        where: { userId: user.id },
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          bio: user.bio,
          website: user.website,
          isVerified: user.isVerified,
          preferredLang: user.preferredLang,
          createdAt: user.createdAt,
        },
        reputation,
        venues: user.venueAdmin.map(va => va.venue),
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }
    
    logger.error({ error }, 'Get user failed');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user',
      },
    });
  }
});

export default router;
