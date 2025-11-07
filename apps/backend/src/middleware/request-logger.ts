import type { NextFunction, Request, Response } from 'express';

import { createLogger } from '../logger/index.js';

const httpLogger = createLogger('http');

const sanitizeHeaderValue = (value: number | string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return value;
};

const extractRequestId = (req: Request, res: Response): string | undefined => {
  return (
    (typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined) ??
    sanitizeHeaderValue(res.getHeader('x-request-id')) ??
    sanitizeHeaderValue(req.headers['x-request-id'])
  );
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const latencyMs = Math.round(durationMs * 100) / 100;
    const requestId = extractRequestId(req, res);

    const payload = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs,
      requestId,
      userAgent: req.get('user-agent'),
      contentLength: sanitizeHeaderValue(res.getHeader('content-length')),
    };

    if (res.statusCode >= 500) {
      httpLogger.error('HTTP request failed', payload);
      return;
    }

    if (res.statusCode >= 400) {
      httpLogger.warn('HTTP request completed with client error', payload);
      return;
    }

    httpLogger.info('HTTP request completed', payload);
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      httpLogger.warn('HTTP request closed before completion', {
        method: req.method,
        path: req.originalUrl,
        latencyMs: Math.round(durationMs * 100) / 100,
        requestId: extractRequestId(req, res),
      });
    }
  });

  next();
};
