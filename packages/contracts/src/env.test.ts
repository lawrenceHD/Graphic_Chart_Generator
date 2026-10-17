import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const validSource = {
  DATABASE_URL: 'postgresql://postgres:password@localhost:5432/graphic_chart_dev',
  R2_ACCOUNT_ID: 'development-account',
  R2_ACCESS_KEY_ID: 'development-access-key',
  R2_SECRET_ACCESS_KEY: 'development-secret-key',
  R2_BUCKET: 'development-assets',
  AI_PROVIDER: 'gemini',
  AI_MODEL: 'development-model',
  AI_API_KEY: 'development-ai-key',
  AI_DAILY_BUDGET_EUR: '5.5',
  AI_USER_DAILY_TOKENS: '1000',
  AUTH_SECRET: 'development-auth-secret',
  APP_URL: 'http://localhost:3000',
  TURNSTILE_SECRET: 'development-turnstile-secret',
  TURNSTILE_SITE_KEY: 'development-turnstile-site-key',
  EMAIL_API_KEY: 'development-email-key',
  EMAIL_FROM: 'Atelier <noreply@example.invalid>',
  SENTRY_DSN: 'https://public@example.invalid/1',
  INTERNAL_PRINT_SECRET: 'development-print-secret',
};

describe('loadEnv', () => {
  it('validates all environment variables and parses numeric limits', () => {
    const result = loadEnv(validSource);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.DATABASE_URL).toBe(validSource.DATABASE_URL);
      expect(result.value.AI_DAILY_BUDGET_EUR).toBe(5.5);
      expect(result.value.AI_USER_DAILY_TOKENS).toBe(1000);
    }
  });

  it('reports a missing variable by name without exposing values', () => {
    const source = Object.fromEntries(
      Object.entries(validSource).filter(([name]) => name !== 'DATABASE_URL'),
    );
    const result = loadEnv(source);

    expect(result).toEqual({
      ok: false,
      error: { invalidVariables: ['DATABASE_URL'] },
    });
    expect(JSON.stringify(result)).not.toContain('development-secret-key');
  });

  it('reports invalid values by variable name without exposing the value', () => {
    const secretSentinel = 'never-print-this-secret';
    const result = loadEnv({ ...validSource, APP_URL: secretSentinel });

    expect(result).toEqual({
      ok: false,
      error: { invalidVariables: ['APP_URL'] },
    });
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
  });

  it('rejects non-numeric budgets and non-positive token limits', () => {
    const invalidBudget = loadEnv({ ...validSource, AI_DAILY_BUDGET_EUR: 'many' });
    const invalidTokens = loadEnv({ ...validSource, AI_USER_DAILY_TOKENS: '0' });

    expect(invalidBudget).toEqual({
      ok: false,
      error: { invalidVariables: ['AI_DAILY_BUDGET_EUR'] },
    });
    expect(invalidTokens).toEqual({
      ok: false,
      error: { invalidVariables: ['AI_USER_DAILY_TOKENS'] },
    });
  });

  it('rejects an R2 account id that could inject directives into the CSP', () => {
    const result = loadEnv({ ...validSource, R2_ACCOUNT_ID: 'acme; script-src *' });

    expect(result).toEqual({
      ok: false,
      error: { invalidVariables: ['R2_ACCOUNT_ID'] },
    });
  });
});
