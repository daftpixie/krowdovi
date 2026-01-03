// ============================================
// WAYFIND API - DATABASE CLIENT
// ============================================

import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: config.nodeEnv === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'pretty',
});

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = db;
}

// Connection test
db.$connect()
  .then(() => {
    logger.info('✅ Database connected');
  })
  .catch((error) => {
    logger.error({ error }, '❌ Database connection failed');
    process.exit(1);
  });

export type Database = typeof db;
