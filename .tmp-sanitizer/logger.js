'use strict';
var _a;
Object.defineProperty(exports, '__esModule', { value: true });
exports.logger = void 0;
const winston_1 = require('winston');
const { combine, errors, json, splat, timestamp, printf, colorize } = winston_1.format;
const consolePrintf = printf(({ level, message, timestamp: time, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${time}] ${level}: ${message}${metaString}`;
});
const consoleFormat =
  process.env.NODE_ENV !== 'production'
    ? combine(colorize(), timestamp(), consolePrintf)
    : combine(timestamp(), consolePrintf);
exports.logger = (0, winston_1.createLogger)({
  level: (_a = process.env.LOG_LEVEL) !== null && _a !== void 0 ? _a : 'info',
  format: combine(errors({ stack: true }), splat(), json()),
  transports: [
    new winston_1.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: consoleFormat,
    }),
  ],
  exitOnError: false,
});
