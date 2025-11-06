import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { projectMetadata } from '@berthcare/shared';
import { createLogger } from '@berthcare/utils';

const app = express();
app.disable('x-powered-by');

const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
const log = createLogger('backend', {
  service: projectMetadata.service,
  version: projectMetadata.version,
  environment,
});

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  const rate = Number.parseFloat(value ?? '');
  if (Number.isNaN(rate) || rate < 0 || rate > 1) {
    return fallback;
  }
  return rate;
};

const sentryDsn = process.env.SENTRY_DSN_BACKEND;
const tracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1);
const profilesSampleRate = parseSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0);

const isSentryEnabled = Boolean(sentryDsn);

if (isSentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    release: projectMetadata.version,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    tracesSampleRate,
    profilesSampleRate,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  log.info('Sentry initialised', {
    event: 'sentry_initialized',
    tracesSampleRate,
    profilesSampleRate,
  });
} else {
  log.warn('Sentry disabled - DSN not configured', { event: 'sentry_disabled' });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sanitizeHeaderValue = (value: number | string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return value;
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const latencyMs = Math.round(durationMs * 100) / 100;
    const requestId = sanitizeHeaderValue(res.getHeader('x-request-id')) ?? sanitizeHeaderValue(req.headers['x-request-id']);

    const payload = {
      event: 'http_request',
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      latency_ms: latencyMs,
      request_id: requestId,
      user_agent: req.get('user-agent'),
      content_length: sanitizeHeaderValue(res.getHeader('content-length')),
    };

    if (res.statusCode >= 500) {
      log.error('HTTP request failed', payload);
      return;
    }

    if (res.statusCode >= 400) {
      log.warn('HTTP request completed with client error', payload);
      return;
    }

    log.info('HTTP request completed', payload);
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      log.warn('HTTP request closed before completion', {
        event: 'http_request_aborted',
        method: req.method,
        path: req.originalUrl,
        latency_ms: Math.round(durationMs * 100) / 100,
      });
    }
  });

  next();
});

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: projectMetadata.service,
    version: projectMetadata.version,
  });
});

if (isSentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  log.error('Unhandled error in request pipeline', {
    event: 'unhandled_exception',
    method: req.method,
    path: req.originalUrl,
    error,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    requestId: sanitizeHeaderValue(res.getHeader('x-request-id')),
  });
});

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  log.info('Backend API listening', {
    event: 'server_started',
    port,
  });
});

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const SHUTDOWN_TIMEOUT_MS = parsePositiveInt(process.env.SHUTDOWN_TIMEOUT_MS, 5000);
const SENTRY_FLUSH_TIMEOUT_MS = parsePositiveInt(process.env.SENTRY_FLUSH_TIMEOUT_MS, 2000);
let shuttingDown = false;

const gracefulShutdown = (
  trigger: 'unhandled_rejection' | 'uncaught_exception' | 'sigterm' | 'sigint',
  detail: unknown,
) => {
  if (shuttingDown) {
    log.warn('Shutdown already in progress', {
      event: 'shutdown_in_progress',
      trigger,
      detail,
    });
    return;
  }

  shuttingDown = true;

  log.error('Initiating graceful shutdown', {
    event: 'graceful_shutdown_start',
    trigger,
    detail,
    timeout_ms: SHUTDOWN_TIMEOUT_MS,
  });

  const forceExitTimer = setTimeout(async () => {
    log.error('Force exiting after timeout during shutdown', {
      event: 'graceful_shutdown_timeout',
      trigger,
      timeout_ms: SHUTDOWN_TIMEOUT_MS,
    });

    try {
      await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS / 1000);
    } catch (flushError) {
      log.warn('Sentry flush failed during forced shutdown', {
        event: 'sentry_flush_failed',
        trigger,
        error: flushError,
      });
    }

    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  if (typeof forceExitTimer.unref === 'function') {
    forceExitTimer.unref();
  }

  server.close(async (closeError) => {
    clearTimeout(forceExitTimer);

    if (closeError) {
      log.error('Error encountered while closing server', {
        event: 'graceful_shutdown_close_error',
        trigger,
        error: closeError,
      });
    } else {
      log.info('HTTP server closed gracefully', {
        event: 'graceful_shutdown_complete',
        trigger,
      });
    }

    try {
      await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS / 1000);
    } catch (flushError) {
      log.warn('Sentry flush failed during shutdown', {
        event: 'sentry_flush_failed',
        trigger,
        error: flushError,
      });
    }

    process.exit(1);
  });
};

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection', {
    event: 'unhandled_rejection',
    reason,
  });

  gracefulShutdown('unhandled_rejection', reason);
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', {
    event: 'uncaught_exception',
    error,
  });

  gracefulShutdown('uncaught_exception', error);
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM, initiating shutdown', {
    event: 'signal_received',
    signal: 'SIGTERM',
  });

  gracefulShutdown('sigterm', 'SIGTERM');
});

process.on('SIGINT', () => {
  log.info('Received SIGINT, initiating shutdown', {
    event: 'signal_received',
    signal: 'SIGINT',
  });

  gracefulShutdown('sigint', 'SIGINT');
});
