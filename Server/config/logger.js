const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = logger;
