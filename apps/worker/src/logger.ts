import pino from 'pino';

// Same policy as apps/web/src/logger.ts: sensitive keys are redacted at any depth, and failures are logged
// by class and driver code only (messages may echo hosts, queries or user data).
const SENSITIVE_KEY = /authorization|cookie|password|passwd|secret|token|api[-_]?key|credential/i;
const REDACTED = '[REDACTED]';

function redact(value: unknown, depth: number): unknown {
  if (depth > 10) return REDACTED;
  if (Array.isArray(value)) return value.map((item: unknown) => redact(item, depth + 1));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : redact(entry, depth + 1),
    ]),
  );
}

export function createLogger(destination?: pino.DestinationStream): pino.Logger {
  return pino(
    {
      formatters: { log: (object) => Object.fromEntries(Object.entries(redact(object, 0) ?? {})) },
    },
    destination,
  );
}

export function errorSummary(cause: unknown): { readonly name: string; readonly code?: string } {
  if (!(cause instanceof Error)) return { name: typeof cause };
  const code: unknown = Reflect.get(cause, 'code');
  return typeof code === 'string' ? { name: cause.name, code } : { name: cause.name };
}
