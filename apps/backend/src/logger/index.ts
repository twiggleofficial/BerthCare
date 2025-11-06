import { format, transports, createLogger as createWinstonLogger } from 'winston';

import { projectMetadata } from '@berthcare/shared';

import { env } from '../config/environment.js';

const baseLogger = createWinstonLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  defaultMeta: {
    service: projectMetadata.service,
    version: projectMetadata.version,
    environment: env.appEnv,
  },
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [new transports.Console()],
});

export const rootLogger = baseLogger;

export const createLogger = (scope: string) => {
  return baseLogger.child({ scope });
};

export const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const serialized = (() => {
      try {
        return JSON.stringify(error);
      } catch {
        return '[unserializable]';
      }
    })();

    return {
      name: 'NonErrorThrowable',
      message: 'Non-error value thrown',
      detail: serialized,
    };
  }

  return {
    name: 'NonErrorThrowable',
    message: String(error),
  };
};
