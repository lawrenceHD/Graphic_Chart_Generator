import { z } from 'zod';
import { err, ok, type Result } from '@app/kernel';

const requiredText = z.string().trim().min(1);
// Interpolated into the CSP host source (ADR-023): a DNS label only, so it cannot add directives.
const r2AccountId = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i);
const positiveDecimal = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/)
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value > 0);
const positiveInteger = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine((value) => Number.isSafeInteger(value) && value > 0);
function hasProtocol(value: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const webUrl = z.url().refine((value) => hasProtocol(value, ['http:', 'https:']));
const databaseUrl = z.url().refine((value) => hasProtocol(value, ['postgres:', 'postgresql:']));

export const Env = z.object({
  DATABASE_URL: databaseUrl,
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: requiredText,
  R2_SECRET_ACCESS_KEY: requiredText,
  R2_BUCKET: requiredText,
  AI_PROVIDER: requiredText,
  AI_MODEL: requiredText,
  AI_API_KEY: requiredText,
  AI_DAILY_BUDGET_EUR: positiveDecimal,
  AI_USER_DAILY_TOKENS: positiveInteger,
  AUTH_SECRET: requiredText,
  APP_URL: webUrl,
  TURNSTILE_SECRET: requiredText,
  TURNSTILE_SITE_KEY: requiredText,
  EMAIL_API_KEY: requiredText,
  EMAIL_FROM: requiredText,
  SENTRY_DSN: webUrl,
  INTERNAL_PRINT_SECRET: requiredText,
});

export type Env = z.infer<typeof Env>;

export type EnvError = { readonly invalidVariables: string[] };

const environmentVariableNames = Object.keys(Env.shape);

export function loadEnv(source: unknown): Result<Env, EnvError> {
  const parsed = Env.safeParse(source);

  if (parsed.success) {
    return ok(parsed.data);
  }

  const invalidVariables = new Set<string>();
  for (const issue of parsed.error.issues) {
    const variableName = issue.path[0];
    if (typeof variableName === 'string') {
      invalidVariables.add(variableName);
    }
  }

  return err({
    invalidVariables: invalidVariables.size > 0 ? [...invalidVariables] : environmentVariableNames,
  });
}
