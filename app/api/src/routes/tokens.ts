// ============================================
// WAYFIND API - TOKEN ROUTES
// Burn-and-mint tokenomics
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Connection, PublicKey } from '@solana/web3.js';
import { db } from '../lib/db';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { authMiddleware, platformAdminMiddleware } from '../middleware/auth';

const router = Router();

// Initialize Solana connection
const connection = new Connection(config.solana.rpcUrl, 'confirmed');

// Token constants
const BURN_RATIO = 0.75; // 75% burned
const REMINT_RATIO = 0.25; // 25% to creators
const WEEKLY_REMINT_CAP = 500000n * 10n ** 9n; // 500k tokens with 9 decimals
const TOKENS_PER_CREDIT = 1n * 10n ** 9n; // 1 token = 1 credit

// GET /tokens/config - Get token configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      symbol: 'WAYFIND',
      name: 'Wayfind Token',
      decimals: 9,
      burnRatio: BURN_RATIO,
      remintRatio: REMINT_RATIO,
      weeklyRemintCap: WEEKLY_REMINT_CAP.toString(),
      tokensPerCredit: TOKENS_PER_CREDIT.toString(),
      network: config.solana.network,
      programId: config.solana.programId,
    },
  });
});

// GET /tokens/balance/:address - Get token balance
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    // In production, this would query the Solana blockchain
    // For MVP, we'll return mock data
    const user = await db.user.findFirst({
      where: { walletAddress: address },
    });
    
    // Sum up burn events to calculate credits
    const burnEvents = await db.burnEvent.findMany({
      where: { walletAddress: address },
    });
    
    const totalCredits = burnEvents.reduce((sum, e) => sum + e.creditsPurchased, 0);
    
    res.json({
      success: true,
      data: {
        wallet: address,
        balance: '0', // Would come from blockchain
        credits: totalCredits,
        pendingRewards: '0',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get balance failed');
    res.status(500).json({ success: false, error: { code: 'BALANCE_FAILED', message: 'Failed to get balance' } });
  }
});

// POST /tokens/burn - Record a burn event (after on-chain tx)
router.post('/burn', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { txSignature, amount } = z.object({
      txSignature: z.string().min(64).max(128),
      amount: z.string(), // BigInt as string
    }).parse(req.body);
    
    // Check if tx already recorded
    const existing = await db.burnEvent.findUnique({
      where: { txSignature },
    });
    
    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_RECORDED', message: 'Transaction already recorded' } });
    }
    
    const amountBigInt = BigInt(amount);
    const burnedAmount = amountBigInt * BigInt(Math.floor(BURN_RATIO * 100)) / 100n;
    const remintPoolAmount = amountBigInt - burnedAmount;
    const credits = Number(amountBigInt / TOKENS_PER_CREDIT);
    
    const burnEvent = await db.burnEvent.create({
      data: {
        txSignature,
        walletAddress: req.walletAddress!,
        userId: req.userId,
        amount: amountBigInt,
        creditsPurchased: credits,
        burnedAmount,
        remintPoolAmount,
      },
    });
    
    logger.info({ txSignature, amount, credits }, 'Burn event recorded');
    
    res.status(201).json({
      success: true,
      data: {
        id: burnEvent.id,
        creditsPurchased: credits,
        burnedAmount: burnedAmount.toString(),
        remintPoolAmount: remintPoolAmount.toString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Record burn failed');
    res.status(400).json({ success: false, error: { code: 'BURN_FAILED', message: 'Failed to record burn' } });
  }
});

// GET /tokens/epochs - Get reward epochs
router.get('/epochs', async (req: Request, res: Response) => {
  try {
    const epochs = await db.rewardEpoch.findMany({
      orderBy: { epochNumber: 'desc' },
      take: 12,
      include: {
        _count: { select: { rewards: true } },
      },
    });
    
    res.json({ success: true, data: epochs });
  } catch (error) {
    logger.error({ error }, 'Get epochs failed');
    res.status(500).json({ success: false, error: { code: 'EPOCHS_FAILED', message: 'Failed to get epochs' } });
  }
});

// GET /tokens/epochs/:id - Get epoch details
router.get('/epochs/:id', async (req: Request, res: Response) => {
  try {
    const epoch = await db.rewardEpoch.findUnique({
      where: { id: req.params.id },
      include: {
        rewards: {
          include: {
            creator: { select: { id: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { finalReward: 'desc' },
        },
      },
    });
    
    if (!epoch) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Epoch not found' } });
    }
    
    res.json({ success: true, data: epoch });
  } catch (error) {
    logger.error({ error }, 'Get epoch failed');
    res.status(500).json({ success: false, error: { code: 'EPOCH_FAILED', message: 'Failed to get epoch' } });
  }
});

// POST /tokens/distribute - Trigger reward distribution (admin only)
router.post('/distribute', authMiddleware, platformAdminMiddleware, async (req: Request, res: Response) => {
  try {
    // Get unclaimed burns since last epoch
    const lastEpoch = await db.rewardEpoch.findFirst({
      orderBy: { epochNumber: 'desc' },
    });
    
    const epochNumber = (lastEpoch?.epochNumber || 0) + 1;
    const weekEnding = new Date();
    const weekStarting = new Date(weekEnding.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Sum remint pool from burns this week
    const burnStats = await db.burnEvent.aggregate({
      where: {
        createdAt: {
          gte: weekStarting,
          lt: weekEnding,
        },
      },
      _sum: { burnedAmount: true, remintPoolAmount: true },
    });
    
    const totalBurned = burnStats._sum.burnedAmount || 0n;
    let totalRemint = burnStats._sum.remintPoolAmount || 0n;
    
    // Apply weekly cap
    if (totalRemint > WEEKLY_REMINT_CAP) {
      totalRemint = WEEKLY_REMINT_CAP;
    }
    
    // Get creators with views this week
    const creatorsWithViews = await db.video.groupBy({
      by: ['creatorId'],
      where: {
        status: 'PUBLISHED',
        weeklyViews: { gt: 0 },
      },
      _sum: { weeklyViews: true },
    });
    
    // Get reputations
    const reputations = await db.creatorReputation.findMany({
      where: { userId: { in: creatorsWithViews.map(c => c.creatorId) } },
    });
    const repMap = new Map(reputations.map(r => [r.userId, r]));
    
    // Calculate weighted shares
    const totalWeightedViews = creatorsWithViews.reduce((sum, c) => {
      const rep = repMap.get(c.creatorId);
      const multiplier = rep?.multiplier || 1.0;
      return sum + (c._sum.weeklyViews || 0) * multiplier;
    }, 0);
    
    // Create epoch
    const epoch = await db.rewardEpoch.create({
      data: {
        epochNumber,
        weekStarting,
        weekEnding,
        totalBurned,
        totalReminted: totalRemint,
        recipientCount: creatorsWithViews.length,
        status: 'PROCESSING',
      },
    });
    
    // Create rewards for each creator
    const rewards = [];
    for (const creator of creatorsWithViews) {
      const rep = repMap.get(creator.creatorId);
      const views = creator._sum.weeklyViews || 0;
      const multiplier = rep?.multiplier || 1.0;
      const weightedViews = views * multiplier;
      
      const share = totalWeightedViews > 0 ? weightedViews / totalWeightedViews : 0;
      const baseReward = BigInt(Math.floor(Number(totalRemint) * (views / totalWeightedViews)));
      const finalReward = BigInt(Math.floor(Number(baseReward) * multiplier));
      
      const user = await db.user.findUnique({
        where: { id: creator.creatorId },
        select: { payoutAddress: true, walletAddress: true },
      });
      
      rewards.push({
        epochId: epoch.id,
        creatorId: creator.creatorId,
        walletAddress: user?.payoutAddress || user?.walletAddress || '',
        reputationScore: rep?.overall || 50,
        tierMultiplier: multiplier,
        viewsThisWeek: views,
        baseReward,
        finalReward,
      });
    }
    
    await db.creatorReward.createMany({ data: rewards });
    
    // Reset weekly views
    await db.video.updateMany({
      where: { weeklyViews: { gt: 0 } },
      data: { weeklyViews: 0 },
    });
    
    // Update epoch status
    await db.rewardEpoch.update({
      where: { id: epoch.id },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
    
    logger.info({ epochNumber, recipientCount: rewards.length, totalRemint: totalRemint.toString() }, 'Rewards distributed');
    
    res.json({
      success: true,
      data: {
        epochNumber,
        recipientCount: rewards.length,
        totalBurned: totalBurned.toString(),
        totalReminted: totalRemint.toString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Distribute rewards failed');
    res.status(500).json({ success: false, error: { code: 'DISTRIBUTE_FAILED', message: 'Failed to distribute rewards' } });
  }
});

// POST /tokens/claim - Claim pending rewards
router.post('/claim', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pendingRewards = await db.creatorReward.findMany({
      where: {
        creatorId: req.userId,
        claimed: false,
      },
    });
    
    if (pendingRewards.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_REWARDS', message: 'No pending rewards to claim' } });
    }
    
    const totalReward = pendingRewards.reduce((sum, r) => sum + r.finalReward, 0n);
    
    // In production, this would trigger on-chain minting
    // For MVP, we just mark as claimed
    await db.creatorReward.updateMany({
      where: {
        id: { in: pendingRewards.map(r => r.id) },
      },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    });
    
    // Update creator earnings
    await db.creatorReputation.update({
      where: { userId: req.userId },
      data: {
        totalEarnings: { increment: Number(totalReward) / 1e9 },
      },
    });
    
    logger.info({ userId: req.userId, amount: totalReward.toString() }, 'Rewards claimed');
    
    res.json({
      success: true,
      data: {
        claimedAmount: totalReward.toString(),
        rewardCount: pendingRewards.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Claim rewards failed');
    res.status(500).json({ success: false, error: { code: 'CLAIM_FAILED', message: 'Failed to claim rewards' } });
  }
});

export default router;
