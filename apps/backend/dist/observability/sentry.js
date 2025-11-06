import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { projectMetadata } from '@berthcare/shared';
import { env } from '../config/environment.js';
import { createLogger } from '../logger/index.js';
const sentryLogger = createLogger('sentry');
let sentryErrorHandler = null;
export const configureSentry = (app) => {
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
export const getSentryErrorHandler = () => {
    return sentryErrorHandler;
};
export const flushSentry = async () => {
    if (!env.sentry.dsn) {
        return;
    }
    try {
        await Sentry.flush(env.sentry.flushTimeoutMs / 1000);
    }
    catch (error) {
        sentryLogger.warn('Sentry flush failed', { error });
    }
};
