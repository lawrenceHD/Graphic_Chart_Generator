import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// SEC-10 / SEC-09: a 256-bit random token, sent in a cookie signed with HMAC-SHA-256 and stored only as its
// SHA-256 hash, so a database leak gives no usable cookie and a forged cookie fails before any query.
const TOKEN_BYTES = 32;
const SIGNATURE_LABEL = 'atelier-guest-session-v1';

const base64url = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64url');

function signature(token: string, secret: string): string {
  return createHmac('sha256', secret).update(`${SIGNATURE_LABEL}:${token}`).digest('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newGuestToken(secret: string): { token: string; cookieValue: string } {
  const token = base64url(randomBytes(TOKEN_BYTES));
  return { token, cookieValue: `${token}.${signature(token, secret)}` };
}

/** Token of a correctly signed cookie value, or undefined (constant-time signature check). */
export function readGuestCookie(cookieValue: string, secret: string): string | undefined {
  const [token, provided, extra] = cookieValue.split('.');
  if (token === undefined || provided === undefined || extra !== undefined || token.length === 0)
    return undefined;
  const expected = Buffer.from(signature(token, secret));
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? token : undefined;
}
