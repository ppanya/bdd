/**
 * support/logger.ts — lightweight structured logger
 *
 * Usage:
 *   import logger from '../support/logger.ts';
 *   logger.info('step executed', { scenario: 'login' });
 *   logger.warn('session unstable', { error: err.message });
 */

type Meta = Record<string, unknown>;

function fmt(level: string, msg: string, meta?: Meta): string {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] ${level}: ${msg}${metaStr}`;
}

export const logger = {
  info:  (msg: string, meta?: Meta) => console.log(fmt('info',  msg, meta)),
  warn:  (msg: string, meta?: Meta) => console.warn(fmt('warn',  msg, meta)),
  error: (msg: string, meta?: Meta) => console.error(fmt('error', msg, meta)),
};

export default logger;
