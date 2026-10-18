import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth, getLoginThrottle } from '../../../../server/context';
import { throttledSignIn } from '../../../../server/login-throttle';

// Sign-up, sign-in, verification and reset are served by Better Auth (04_API_CONTRACTS.md §3); e-mail sign-in
// also goes through the per-account limit (SEC-05).
export function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request): Promise<Response> {
  const handler = toNextJsHandler(getAuth()).POST;
  return new URL(request.url).pathname.endsWith('/sign-in/email')
    ? throttledSignIn(handler, getLoginThrottle())(request)
    : handler(request);
}
