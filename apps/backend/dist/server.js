import { app } from './app.js';
import { getRedisClient, closeRedisConnection } from './cache/index.js';
import { env } from './config/environment.js';
import { getDatabasePool, waitForDatabasePool, closeDatabasePool } from './database/index.js';
import { createLogger, serializeError } from './logger/index.js';
import { flushSentry } from './observability/sentry.js';
const serverLogger = createLogger('server');
getDatabasePool();
getRedisClient();
let shuttingDown = false;
let httpServer = null;
const start = async () => {
    await waitForDatabasePool();
    httpServer = app.listen(env.port, () => {
        serverLogger.info('Backend server listening', { port: env.port });
    });
};
const gracefulShutdown = async (trigger, detail) => {
    if (shuttingDown) {
        serverLogger.warn('Shutdown already in progress', { trigger });
        return;
    }
    shuttingDown = true;
    serverLogger.warn('Initiating graceful shutdown', {
        trigger,
        detail,
        timeoutMs: env.shutdownTimeoutMs,
    });
    const timeout = setTimeout(() => {
        serverLogger.error('Force exiting after shutdown timeout', { trigger });
        process.exit(1);
    }, env.shutdownTimeoutMs);
    if (typeof timeout.unref === 'function') {
        timeout.unref();
    }
    const closeHttpServer = async () => {
        if (!httpServer) {
            return;
        }
        await new Promise((resolve) => {
            httpServer?.close((error) => {
                if (error) {
                    serverLogger.error('Error while closing HTTP server', { error: serializeError(error) });
                }
                resolve();
            });
        });
    };
    try {
        await Promise.allSettled([
            closeHttpServer(),
            closeDatabasePool(),
            closeRedisConnection(),
            flushSentry(),
        ]);
    }
    finally {
        clearTimeout(timeout);
        serverLogger.info('Shutdown complete', { trigger });
        process.exit(trigger === 'uncaughtException' ? 1 : 0);
    }
};
process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
});
process.on('unhandledRejection', (reason) => {
    serverLogger.error('Unhandled promise rejection', { reason: serializeError(reason) });
    void gracefulShutdown('unhandledRejection', reason);
});
process.on('uncaughtException', (error) => {
    serverLogger.error('Uncaught exception', { error: serializeError(error) });
    void gracefulShutdown('uncaughtException', error);
});
void start();
