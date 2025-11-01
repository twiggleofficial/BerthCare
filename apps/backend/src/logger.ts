import { createLogger, format, transports } from 'winston';
import { inspect } from 'node:util';

const { combine, errors, json, splat, timestamp, printf, colorize } = format;

const consolePrintf = printf(({ level, message, timestamp: time, ...meta }) => {
  const metaString = Object.keys(meta).length
    ? ` ${inspect(meta, { depth: null, compact: false, breakLength: Infinity })}`
    : '';
  return `[${time}] ${level}: ${message}${metaString}`;
});

const consoleFormat =
  process.env.NODE_ENV !== 'production'
    ? combine(colorize(), timestamp(), consolePrintf)
    : combine(timestamp(), consolePrintf);

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: combine(errors({ stack: true }), splat(), json()),
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});

export type Logger = typeof logger;
