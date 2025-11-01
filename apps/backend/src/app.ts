import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { checkRedisConnection } from './cache/redis';
import { checkDatabaseConnection } from './database/pool';
import { logger } from './logger';
import { authRouter } from './auth/routes';
import { photoRouter } from './photos/routes';
import { checkPhotoBucketHealth } from './storage/s3';

const SENSITIVE_QUERY_KEYS = new Set(['token', 'password', 'email']);
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

const sanitizeUrl = (originalUrl: string): string => {
  try {
    const parsedUrl = new URL(originalUrl, 'http://placeholder');
    if (!parsedUrl.search) {
      return parsedUrl.pathname + parsedUrl.hash;
    }

    const searchParams = new URLSearchParams(parsedUrl.search);
    searchParams.forEach((_value, key) => {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        searchParams.set(key, '[REDACTED]');
      }
    });

    const sanitizedQuery = searchParams.toString();
    parsedUrl.search = sanitizedQuery ? `?${sanitizedQuery}` : '';
    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch {
    const [path] = originalUrl.split('?');
    return path;
  }
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const configuredMax = Number.parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10);
const rateLimitMax = Number.isNaN(configuredMax) ? 100 : configuredMax;

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? undefined;

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const sanitizedUrl = sanitizeUrl(req.originalUrl ?? req.url ?? '');

    logger.info(`${req.method} ${sanitizedUrl}`, {
      statusCode: res.statusCode,
      durationMs,
      method: req.method,
      url: sanitizedUrl,
      userAgent: req.get('user-agent') ?? undefined,
    });
  });

  next();
});

app.use('/v1', rateLimiter);
app.use('/v1/auth', authRouter);
app.use('/v1/photos', photoRouter);

app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  const timeoutError = new Error(`Health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`);

  try {
    const [dbHealth, redisHealth, storageHealth] = await withTimeout(
      Promise.all([checkDatabaseConnection(), checkRedisConnection(), checkPhotoBucketHealth()]),
      HEALTH_CHECK_TIMEOUT_MS,
      timeoutError
    );
    const healthy = dbHealth.healthy && redisHealth.healthy && storageHealth.healthy;
    const statusCode = healthy ? 200 : 503;

    res.status(statusCode).json({
      status: healthy ? 'ok' : 'degraded',
      checks: {
        database: dbHealth,
        redis: redisHealth,
        storage: storageHealth,
      },
    });
  } catch (error) {
    if (error === timeoutError) {
      logger.warn('Health check timed out', {
        timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
      });

      res.status(503).json({
        status: 'degraded',
        message: timeoutError.message,
        checks: {
          database: {
            healthy: false,
            nodes: {
              primary: { healthy: false, error: timeoutError.message },
            },
          },
          redis: {
            healthy: false,
            nodes: {
              cache: { healthy: false, error: timeoutError.message },
              session: { healthy: false, error: timeoutError.message },
            },
          },
          storage: {
            healthy: false,
            bucket: 'unknown',
            region: 'unknown',
            error: timeoutError.message,
          },
        },
      });
      return;
    }

    next(error);
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found', path: req.originalUrl });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const error = err instanceof Error ? err : new Error('Unknown error');

  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
  });

  if (res.headersSent) {
    return next(error);
  }

  const status = (error as { status?: number }).status ?? 500;
  const message = status === 500 ? 'Internal Server Error' : error.message;

  res.status(status).json({ message });
});

export const __TESTING__ = {
  sanitizeUrl,
  withTimeout,
};
