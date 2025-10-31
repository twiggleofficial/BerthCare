import type { Server } from 'http';

import { app } from './app';
import { closeRedisConnections } from './cache/redis';
import { closePool } from './database/pool';
import { logger } from './logger';

const DEFAULT_PORT = 3000;

const normalisePort = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
};

export const startBackend = (
  port: number = normalisePort(process.env.PORT ?? `${DEFAULT_PORT}`)
): Server => {
  const server = app.listen(port, () => {
    logger.info(`Backend service listening on port ${port}`);
  });

  const closeServer = (): Promise<void> =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

  const gracefulShutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    let hasErrors = false;

    try {
      await closeServer();
      logger.info('HTTP server closed');
    } catch (error) {
      const err = error as Error;
      logger.error('Error while closing HTTP server', {
        message: err.message,
      });
      hasErrors = true;
    }

    try {
      await closePool();
      logger.info('Database pool closed');
    } catch (error) {
      const err = error as Error;
      logger.error('Error while closing database pool', {
        message: err.message,
      });
      hasErrors = true;
    }

    try {
      await closeRedisConnections();
      logger.info('Redis connections closed');
    } catch (error) {
      const err = error as Error;
      logger.error('Error while closing Redis connections', {
        message: err.message,
      });
      hasErrors = true;
    }

    process.exit(hasErrors ? 1 : 0);
  };

  process.once('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    logger.error('Server error', {
      message: error.message,
      code: error.code,
    });
    process.exit(1);
  });

  return server;
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
