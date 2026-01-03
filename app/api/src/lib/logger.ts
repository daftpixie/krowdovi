// ============================================
// WAYFIND API - LOGGER
// ============================================

import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    env: config.nodeEnv,
    version: config.version,
  },
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

export type Logger = typeof logger;
