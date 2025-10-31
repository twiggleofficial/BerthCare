import { createLogger, format, transports } from 'winston';

const { combine, errors, json, splat, timestamp, printf, colorize } = format;

const consoleFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp: time, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${time}] ${level}: ${message}${metaString}`;
  })
);

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
