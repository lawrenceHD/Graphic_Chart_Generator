import { describe, expect, it } from 'vitest';
import { failureKey, validateAuthForm } from './auth-logic';

describe('validateAuthForm', () => {
  it('accepts a complete sign-up and trims the name and email', () => {
    const result = validateAuthForm('signup', {
      name: '  Awa Ndiaye ',
      email: ' awa@example.com ',
      password: 'a-long-passphrase',
    });
    expect(result).toEqual({
      ok: true,
      value: { name: 'Awa Ndiaye', email: 'awa@example.com', password: 'a-long-passphrase' },
    });
  });

  it('names every missing or invalid sign-up field', () => {
    const result = validateAuthForm('signup', {
      name: ' ',
      email: 'not-an-email',
      password: 'short',
    });
    expect(result).toEqual({
      ok: false,
      errors: { name: 'nameRequired', email: 'emailInvalid', password: 'passwordShort' },
    });
  });

  it('enforces the server minimum of 10 characters on sign-up only', () => {
    const base = { name: 'A', email: 'a@b.co' };
    expect(validateAuthForm('signup', { ...base, password: 'a'.repeat(9) }).ok).toBe(false);
    expect(validateAuthForm('signup', { ...base, password: 'a'.repeat(10) }).ok).toBe(true);
    expect(validateAuthForm('login', { email: 'a@b.co', password: 'old' }).ok).toBe(true);
  });

  it('asks for the password at sign-in without revealing the policy', () => {
    expect(validateAuthForm('login', { email: 'a@b.co', password: '' })).toEqual({
      ok: false,
      errors: { password: 'passwordRequired' },
    });
  });

  it('rejects a password longer than the server maximum', () => {
    const result = validateAuthForm('signup', {
      name: 'A',
      email: 'a@b.co',
      password: 'a'.repeat(129),
    });
    expect(result).toEqual({ ok: false, errors: { password: 'passwordLong' } });
  });
});

describe('failureKey', () => {
  it('maps the library answers to actionable messages', () => {
    expect(failureKey({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(
      'invalidCredentials',
    );
    // The server answers alike for a new and a taken address: nothing here may tell them apart.
    expect(failureKey({ status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' })).toBe(
      'generic',
    );
    expect(failureKey({ status: 400, code: 'PASSWORD_COMPROMISED' })).toBe('passwordCompromised');
    expect(failureKey({ status: 429 })).toBe('rateLimited');
    expect(failureKey({ status: 500 })).toBe('generic');
    expect(failureKey(null)).toBe('network');
  });
});
