// ============================================
// WAYFIND API - CONFIGURATION
// ============================================

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Cloudflare Stream
  CF_ACCOUNT_ID: z.string(),
  CF_API_TOKEN: z.string(),
  CF_STREAM_SIGNING_KEY: z.string().optional(),
  
  // Solana
  SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta', 'testnet']).default('devnet'),
  WAYFIND_PROGRAM_ID: z.string().optional(),
  WAYFIND_MINT_AUTHORITY: z.string().optional(),
  
  // Anthropic (for translation)
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  
  // App
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  version: '0.1.0',
  
  database: {
    url: env.DATABASE_URL,
  },
  
  redis: {
    url: env.REDIS_URL,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  
  cloudflare: {
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    signingKey: env.CF_STREAM_SIGNING_KEY,
  },
  
  solana: {
    rpcUrl: env.SOLANA_RPC_URL,
    network: env.SOLANA_NETWORK,
    programId: env.WAYFIND_PROGRAM_ID,
    mintAuthority: env.WAYFIND_MINT_AUTHORITY,
  },
  
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
  },
  
  corsOrigins: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  
  appUrl: env.APP_URL,
  apiUrl: env.API_URL,
};

export type Config = typeof config;
