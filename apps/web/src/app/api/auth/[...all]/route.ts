import { toNextJsHandler } from 'better-auth/next-js';
import { trustClientIp } from '../../../../server/client-ip';
import { getAuth, getLoginThrottle, getTrustedProxyHops } from '../../../../server/context';
import { throttledSignIn } from '../../../../server/login-throttle';

// Sign-up, sign-in, verification and reset are served by Better Auth (04_API_CONTRACTS.md §3); e-mail sign-in
// also goes through the per-account limit (SEC-05). The client address Better Auth rate-limits on is resolved
// by trustClientIp with the configured proxy hops, never taken from the client's own headers.
export function GET(request: Request): Promise<Response> {
  return trustClientIp(toNextJsHandler(getAuth()).GET, getTrustedProxyHops())(request);
}

export function POST(request: Request): Promise<Response> {
  const handler = trustClientIp(toNextJsHandler(getAuth()).POST, getTrustedProxyHops());
  return new URL(request.url).pathname.endsWith('/sign-in/email')
    ? throttledSignIn(handler, getLoginThrottle())(request)
    : handler(request);
}
