import type { Authorization } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { z } from 'zod';

// HTTP conventions of 04_API_CONTRACTS.md §1–§2: RFC 9457 errors with a stable code and the request id,
// never an internal detail; Origin checked on every mutation (SEC-06).

export function requestIdOf(request: Request): string {
  return request.headers.get('x-request-id') ?? 'unknown';
}

/** RFC 9457 problem; `detail` is technical English for logs, the interface translates `code`. */
export function problemResponse(
  request: Request,
  status: number,
  code: string,
  detail: string,
): Response {
  return Response.json(
    {
      type: `/errors/${code.toLowerCase().replaceAll('_', '-')}`,
      title: code,
      status,
      code,
      detail,
      requestId: requestIdOf(request),
    },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

/** SEC-06: a mutation must come from the application's own origin. */
export function checkOrigin(request: Request, appUrl: string): Response | null {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(appUrl).origin
    ? null
    : problemResponse(request, 403, 'ORIGIN_REJECTED', 'missing or foreign Origin header');
}

/** 401 / 404 / 403 of an authorize() decision (10_QUALITY.md §7), or null when allowed. */
export function authorizationResponse(request: Request, decision: Authorization): Response | null {
  switch (decision.outcome) {
    case 'allowed':
      return null;
    case 'unauthenticated':
      return problemResponse(request, 401, 'UNAUTHENTICATED', 'sign in required');
    case 'not-found':
      return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
    case 'forbidden':
      return problemResponse(request, 403, decision.code, 'action not allowed for this actor');
  }
}

const MAX_BODY_BYTES = 600 * 1024; // a document is at most 512 KiB (03_DATA_MODEL.md §4)

/** Reads and validates a JSON body; a malformed or oversized body is a 400, never an exception. */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Result<T, Response>> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return err(problemResponse(request, 413, 'PAYLOAD_TOO_LARGE', 'body over the limit'));
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return err(problemResponse(request, 400, 'INVALID_JSON', 'body is not JSON'));
  }
  const parsed = schema.safeParse(value);
  return parsed.success
    ? ok(parsed.data)
    : err(problemResponse(request, 400, 'INVALID_BODY', 'body does not match the contract'));
}

/**
 * Client address behind `hops` trusted proxies. X-Forwarded-For is written by the client first and appended to
 * by each proxy, so only entries from the right are trustworthy: with N proxies the real address is the Nth
 * from the end. With 0 hops the header is ignored (null). The right value depends on the hosting; verify it at
 * deployment (docs/team/QUEUE.md).
 */
export function clientIp(request: Request, hops = 0): string | null {
  if (hops < 1) return null;
  const entries = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  return entries[entries.length - hops] ?? null;
}

/** 429 with Retry-After (04_API_CONTRACTS.md §7). */
export function tooManyRequests(request: Request, retryAfterSeconds: number): Response {
  const response = problemResponse(request, 429, 'RATE_LIMITED', 'too many requests');
  response.headers.set('retry-after', String(retryAfterSeconds));
  return response;
}
