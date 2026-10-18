import { describe, expect, it } from 'vitest';
import { hashToken, newGuestToken, readGuestCookie } from './guest-token';

const SECRET = 'test-only-secret-with-enough-entropy-0123456789';

describe('guest session token (SEC-10)', () => {
  it('issues a 256-bit random token in a signed cookie value', () => {
    const first = newGuestToken(SECRET);
    const second = newGuestToken(SECRET);
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
    expect(readGuestCookie(first.cookieValue, SECRET)).toBe(first.token);
  });

  it('rejects tampered, foreign-secret, malformed or empty values', () => {
    const { token, cookieValue } = newGuestToken(SECRET);
    const [, signed] = cookieValue.split('.');
    expect(readGuestCookie(`${token}x.${signed ?? ''}`, SECRET)).toBeUndefined();
    expect(readGuestCookie(cookieValue, `${SECRET}-other`)).toBeUndefined();
    for (const value of ['', token, `${cookieValue}.extra`, `.${signed ?? ''}`]) {
      expect(readGuestCookie(value, SECRET)).toBeUndefined();
    }
  });

  it('stores only a SHA-256 hash of the token', () => {
    const { token } = newGuestToken(SECRET);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});
