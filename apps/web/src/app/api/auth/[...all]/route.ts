import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '../../../../server/context';

// Sign-up, sign-in, verification and reset are served by Better Auth (04_API_CONTRACTS.md §3).
export function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
