export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMetadata = Record<string, unknown>;

export interface Logger {
  debug: (message: string, metadata?: LogMetadata) => void;
  info: (message: string, metadata?: LogMetadata) => void;
  warn: (message: string, metadata?: LogMetadata) => void;
  error: (message: string, metadata?: LogMetadata) => void;
  withScope: (additional: LogMetadata) => Logger;
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isValidLogLevel = (candidate: string): candidate is LogLevel => {
  return candidate in LOG_PRIORITY;
};

const resolveLogLevel = (): LogLevel => {
  const candidate = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return isValidLogLevel(candidate) ? candidate : 'info';
};

const activeLevel = resolveLogLevel();

const shouldLog = (level: LogLevel): boolean => {
  return LOG_PRIORITY[level] >= LOG_PRIORITY[activeLevel];
};

const serializeValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return value.map((entry) => serializeValue(entry, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      result[key] = serializeValue(entry, seen);
    });
    return result;
  }

  return value;
};

const normalizeMetadata = (metadata?: LogMetadata): Record<string, unknown> => {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    accumulator[key] = serializeValue(value);
    return accumulator;
  }, {});
};

const emit = (
  scope: string,
  level: LogLevel,
  message: string,
  baseContext: Record<string, unknown>,
  metadata?: LogMetadata,
): void => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...baseContext,
    ...normalizeMetadata(metadata),
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  if (level === 'debug') {
    console.debug(serialized);
    return;
  }

  console.log(serialized);
};

export const createLogger = (scope: string, baseContext: LogMetadata = {}): Logger => {
  const normalizedBase = normalizeMetadata(baseContext);

  const log = (level: LogLevel) => {
    return (message: string, metadata?: LogMetadata) => emit(scope, level, message, normalizedBase, metadata);
  };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    withScope: (additional: LogMetadata) => createLogger(scope, { ...normalizedBase, ...additional }),
  };
};
