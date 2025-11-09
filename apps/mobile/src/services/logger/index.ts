/* eslint-disable no-console -- centralized logging utility */
type LogLevel = 'info' | 'warn' | 'error';

type LogMetadata = Record<string, unknown>;

type Logger = {
  info: (message: string, metadata?: LogMetadata) => void;
  warn: (message: string, metadata?: LogMetadata) => void;
  error: (message: string, metadata?: LogMetadata) => void;
};

const logToConsole = (
  level: LogLevel,
  context: string,
  message: string,
  metadata?: LogMetadata,
) => {
  const prefix = `[mobile][${context}] ${message}`;
  const consoleMethod =
    level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;

  if (metadata) {
    consoleMethod(prefix, metadata);
  } else {
    consoleMethod(prefix);
  }
};

const emitLog = (
  level: LogLevel,
  context: string,
  message: string,
  metadata?: LogMetadata,
) => {
  logToConsole(level, context, message, metadata);
  // Placeholder: forward logs to a remote sink (Sentry, DataDog, etc.) when available.
};

export const createLogger = (context: string): Logger => ({
  info: (message, metadata) => emitLog('info', context, message, metadata),
  warn: (message, metadata) => emitLog('warn', context, message, metadata),
  error: (message, metadata) => emitLog('error', context, message, metadata),
});

export const logger = createLogger('mobile');
