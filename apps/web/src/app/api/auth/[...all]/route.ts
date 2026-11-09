import { toNextJsHandler } from 'better-auth/next-js';
import { trustClientIp } from '../../../../server/client-ip';
import {
  getAuth,
  getLoginThrottle,
  getSignupGuardDeps,
  getTrustedProxyHops,
} from '../../../../server/context';
import { throttledSignIn } from '../../../../server/login-throttle';
import { turnstileSignup } from '../../../../server/signup-guard';

// Sign-up, sign-in, verification and reset are served by Better Auth (04_API_CONTRACTS.md §3); e-mail sign-in
// also goes through the per-account limit (SEC-05). The client address Better Auth rate-limits on is resolved
// by trustClientIp with the configured proxy hops, never taken from the client's own headers. Sign-up needs a
// Turnstile token, checked here on the server (SEC-25).
export function GET(request: Request): Promise<Response> {
  return trustClientIp(toNextJsHandler(getAuth()).GET, getTrustedProxyHops())(request);
}

export function POST(request: Request): Promise<Response> {
  const handler = trustClientIp(toNextJsHandler(getAuth()).POST, getTrustedProxyHops());
  const path = new URL(request.url).pathname;
  if (path.endsWith('/sign-in/email')) return throttledSignIn(handler, getLoginThrottle())(request);
  return turnstileSignup(handler, getSignupGuardDeps())(request);
}
