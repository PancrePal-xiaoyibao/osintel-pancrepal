// Structured logger (pino) — replaces console.log across the server.
// Sensitive fields are redacted before they hit the stream.
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: { service: 'osintel-pancrepal' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.apiKey',
      'req.body.password',
      'req.body.token',
      'req.body.config.apiKey',
      '*.apiKey',
      '*.password',
      '*.token',
      'config.apiKey'
    ],
    censor: '[REDACTED]'
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname,service' }
      }
});

export type Logger = typeof logger;
