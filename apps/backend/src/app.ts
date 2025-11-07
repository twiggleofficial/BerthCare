import express, { type Express } from 'express';
import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import helmet, { type HelmetOptions } from 'helmet';
import rateLimit from 'express-rate-limit';

import { projectMetadata } from '@berthcare/shared';

import { createAlertsRouter } from './alerts/index.js';
import { createAuthRouter, createAuthV1Router } from './auth/index.js';
import { createCarePlansRouter } from './care-plans/index.js';
import { createClientsRouter } from './clients/index.js';
import { env } from './config/environment.js';
import { getCacheHealth } from './cache/index.js';
import { getDatabaseHealth } from './database/index.js';
import { createLogger } from './logger/index.js';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { configureSentry, getSentryErrorHandler } from './observability/sentry.js';
import { createFamilyRouter } from './family/index.js';
import { createVisitsRouter } from './visits/index.js';
import { createSyncRouter } from './sync/index.js';
import { createTwilioRouter } from './twilio/index.js';

// API wiring follows project-documentation/architecture-output.md (API Architecture: Simple, Cacheable, Predictable).
// Philosophy: deliver lean, predictable services and obsess over unseen details.
const startupLogger = createLogger('startup');

const app: Express = express();

app.disable('x-powered-by');

configureSentry(app);

const isProduction = env.nodeEnv === 'production';

const parseCorsOrigins = (rawOrigins: string | undefined, fallback: string[]): string[] => {
  if (!rawOrigins) {
    return fallback;
  }

  const trimmed = rawOrigins.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    if (trimmed.startsWith('[')) {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0);
        return cleaned.length > 0 ? cleaned : fallback;
      }

      startupLogger.warn('CORS_ORIGINS JSON did not resolve to an array; using defaults');
      return fallback;
    }

    const cleaned = trimmed
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return cleaned.length > 0 ? cleaned : fallback;
  } catch (error: unknown) {
    startupLogger.warn('Failed to parse CORS_ORIGINS; using defaults', {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
};

const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultCorsOrigins = isProduction
  ? ['https://app.berthcare.ca', 'https://family.berthcare.ca']
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
    ];

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS, defaultCorsOrigins);

const corsOptions: CorsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
};

const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: isProduction
    ? {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://berthcare-photos.s3.amazonaws.com'],
          connectSrc: ["'self'", 'https://api.berthcare.ca'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          mediaSrc: ["'self'"],
        },
      }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  ...(isProduction
    ? {
        hsts: {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        },
      }
    : {}),
};

app.use(cors(corsOptions));
app.use(helmet(helmetOptions));
app.use(compression());
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestId);
app.use(requestLogger);

const apiV1Router = express.Router();

apiV1Router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: projectMetadata.service,
    version: projectMetadata.version,
  });
});

apiV1Router.get('/health/db', async (_req, res) => {
  const health = await getDatabaseHealth();
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

apiV1Router.get('/health/cache', async (_req, res) => {
  const health = await getCacheHealth();
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

apiV1Router.use('/auth', createAuthRouter());
apiV1Router.use('/auth', createAuthV1Router());
apiV1Router.use('/alerts', createAlertsRouter());
apiV1Router.use('/visits', createVisitsRouter());
apiV1Router.use('/clients', createClientsRouter());
apiV1Router.use('/care-plans', createCarePlansRouter());
apiV1Router.use('/family', createFamilyRouter());
apiV1Router.use('/sync', createSyncRouter());
apiV1Router.use('/twilio', createTwilioRouter());

app.use('/v1', apiV1Router);

app.use(notFoundHandler);

const sentryErrorHandler = getSentryErrorHandler();
if (sentryErrorHandler) {
  app.use(sentryErrorHandler);
}

app.use(errorHandler);

startupLogger.info('Express app configured', {
  rateLimit: env.rateLimit,
  nodeEnv: env.nodeEnv,
  corsOrigins,
});

export { app };
