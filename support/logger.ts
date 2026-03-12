/**
 * support/logger.ts — Winston-based structured logger
 *
 * Usage:
 *   import logger from '../support/logger.ts';
 *   logger.info('step executed', { scenario: 'login' });
 *   logger.error('step failed', { error: err.message });
 *
 * Output:
 *   - Console: colored by level
 *   - File: logs/test.log (JSON, appended)
 */

import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] ${level}: ${message}${metaStr}`;
});

const logger = createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
    new transports.File({
      filename: 'logs/test.log',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json()),
    }),
  ],
});

export default logger;
