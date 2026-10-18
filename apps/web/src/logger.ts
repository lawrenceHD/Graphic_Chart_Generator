import pino from 'pino';

// Matched against every key at any depth, case-insensitively: header names and client libraries vary
// (`Authorization`, `set-cookie`, `apiKey`, `client_secret`, `refreshToken`…).
const SENSITIVE_KEY = /authorization|cookie|password|passwd|secret|token|api[-_]?key|credential/i;
const MAX_DEPTH = 10;
const REDACTED = '[REDACTED]';

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((item: unknown) => redactSensitive(item, depth + 1));
  if (typeof value !== 'object' || value === null) return value;

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactSensitive(entry, depth + 1);
  }
  return redacted;
}

export function createLogger(destination?: pino.DestinationStream): pino.Logger {
  return pino(
    {
      formatters: {
        log: (object) => {
          const redacted = redactSensitive(object);
          return typeof redacted === 'object' && redacted !== null && !Array.isArray(redacted)
            ? redacted
            : {};
        },
      },
    },
    destination,
  );
}

const logger = createLogger();

export function requestLogger(requestId: string): pino.Logger {
  return logger.child({ requestId });
}

export function appLogger(): pino.Logger {
  return logger;
}
