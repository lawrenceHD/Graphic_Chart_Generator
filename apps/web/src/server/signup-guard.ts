import { problemResponse, clientIp, tooManyRequests } from './http';
import type { RateLimiter } from './rate-limiter';
import type { TurnstileVerifier } from './turnstile';

// SEC-25: anti-bot check on account creation, enforced on the server before Better Auth sees the request.
// The widget token travels in a header so that the Better Auth body contract stays untouched.
export const TURNSTILE_HEADER = 'x-turnstile-token';
const SIGN_UP_PATH = '/sign-up/email';
const SIGN_UPS_PER_IP = { max: 10, windowMs: 3_600_000 };

/**
 * Cloudflare's documented dummy secrets (always pass / always fail / token spent) start with 1x, 2x or 3x and
 * 31 zeros. They exist for local development; accepted on a public https deployment they would switch the check off.
 */
export function isCloudflareTestSecret(secret: string): boolean {
  return /^[123]x0{28,}/u.test(secret);
}

/**
 * Verifier for the sign-up check, or null when none can be trusted: no secret, or a dummy secret on https.
 * Null is not a bypass: the guard then refuses every sign-up (503) instead of letting bots through.
 */
export function signupVerifier(
  secret: string | undefined,
  appUrl: string,
  create: (secret: string) => TurnstileVerifier,
): TurnstileVerifier | null {
  if (secret === undefined || secret.trim() === '') return null;
  if (appUrl.startsWith('https://') && isCloudflareTestSecret(secret)) return null;
  return create(secret);
}

export interface SignupGuardDeps {
  readonly verify: TurnstileVerifier | null;
  readonly limiter: RateLimiter;
  readonly trustedProxyHops: number;
}

/** Wraps the Better Auth handler: POST /sign-up/email needs a valid Turnstile token, other paths pass through. */
export function turnstileSignup(
  handler: (request: Request) => Promise<Response>,
  deps: SignupGuardDeps,
) {
  return async (request: Request): Promise<Response> => {
    if (!new URL(request.url).pathname.endsWith(SIGN_UP_PATH)) return handler(request);
    const ip = clientIp(request, deps.trustedProxyHops);
    // Before the verification call, so that a flood costs neither Cloudflare calls nor rows.
    const wait = await deps.limiter.hit([
      { key: `sign-up:${ip ?? 'unknown'}`, limit: SIGN_UPS_PER_IP },
    ]);
    if (wait > 0) return tooManyRequests(request, wait);
    if (deps.verify === null) {
      return problemResponse(
        request,
        503,
        'TURNSTILE_NOT_CONFIGURED',
        'sign-up is closed: anti-bot check not configured',
      );
    }
    const token = request.headers.get(TURNSTILE_HEADER) ?? '';
    if (!(await deps.verify(token, ip))) {
      return problemResponse(request, 403, 'TURNSTILE_FAILED', 'anti-bot check failed');
    }
    return handler(request);
  };
}
