// ============================================
// WAYFIND API - EXPRESS 5 SERVER
// Indoor Navigation DePIN Platform
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { config } from './lib/config';
import { logger } from './lib/logger';

// Route imports
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';
import overlayRoutes from './routes/overlays';
import venueRoutes from './routes/venues';
import routeRoutes from './routes/routes';
import creatorRoutes from './routes/creators';
import sessionRoutes from './routes/sessions';
import tokenRoutes from './routes/tokens';
import uploadRoutes from './routes/uploads';
import analyticsRoutes from './routes/analytics';
import translateRoutes from './routes/translate';
import adsRoutes from './routes/ads';

const app: Express = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disabled for video streaming
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Request logging
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = req.headers['x-request-id'] as string || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.version,
    environment: config.nodeEnv,
  });
});

// ============================================
// API ROUTES
// ============================================

const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/videos`, videoRoutes);
app.use(`${API_PREFIX}/overlays`, overlayRoutes);
app.use(`${API_PREFIX}/venues`, venueRoutes);
app.use(`${API_PREFIX}/routes`, routeRoutes);
app.use(`${API_PREFIX}/creators`, creatorRoutes);
app.use(`${API_PREFIX}/sessions`, sessionRoutes);
app.use(`${API_PREFIX}/tokens`, tokenRoutes);
app.use(`${API_PREFIX}/uploads`, uploadRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/translate`, translateRoutes);
app.use(`${API_PREFIX}/ads`, adsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  
  const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(config.nodeEnv !== 'production' && { stack: err.stack }),
    },
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Wayfind API running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
      userId?: string;
      walletAddress?: string;
    }
  }
}
