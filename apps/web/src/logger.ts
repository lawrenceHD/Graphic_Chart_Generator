import pino from 'pino';

const redactedPaths = [
  'authorization',
  'cookie',
  'password',
  'token',
  '*.authorization',
  '*.cookie',
  '*.password',
  '*.token',
  'req.headers.authorization',
  'req.headers.cookie',
];

export function createLogger(destination?: pino.DestinationStream): pino.Logger {
  return pino(
    {
      redact: { paths: redactedPaths, censor: '[REDACTED]' },
    },
    destination,
  );
}

const logger = createLogger();

export function requestLogger(requestId: string): pino.Logger {
  return logger.child({ requestId });
}
