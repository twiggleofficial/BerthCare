import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import type { ErrorRequestHandler, Express } from 'express';

import { projectMetadata } from '@berthcare/shared';

import { env } from '../config/environment.js';
import { createLogger } from '../logger/index.js';

const sentryLogger = createLogger('sentry');

let sentryErrorHandler: ErrorRequestHandler | null = null;

export const configureSentry = (app: Express) => {
  if (!env.sentry.dsn) {
    sentryLogger.warn('Sentry disabled - DSN not configured');
    return;
  }

  Sentry.init({
    dsn: env.sentry.dsn,
    environment: env.appEnv,
    release: projectMetadata.version,
    tracesSampleRate: env.sentry.tracesSampleRate,
    profilesSampleRate: env.sentry.profilesSampleRate,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  sentryErrorHandler = Sentry.Handlers.errorHandler();

  sentryLogger.info('Sentry initialised', {
    tracesSampleRate: env.sentry.tracesSampleRate,
    profilesSampleRate: env.sentry.profilesSampleRate,
  });
};

export const getSentryErrorHandler = (): ErrorRequestHandler | null => {
  return sentryErrorHandler;
};

export const flushSentry = async () => {
  if (!env.sentry.dsn) {
    return;
  }

  try {
    await Sentry.flush(env.sentry.flushTimeoutMs);
  } catch (error) {
    sentryLogger.warn('Sentry flush failed', { error });
  }
};
