import { z } from 'zod';
import { clientIp } from './http';

// Number of proxies in front of the application that append to X-Forwarded-For (0 = none: the header is
// ignored). It depends on the host (Cloud Run, load balancer, CDN) and must be verified at deployment.
const HopsSchema = z.coerce.number().int().min(0).max(5).default(0);

/** TRUSTED_PROXY_HOPS from the environment; an invalid value is a startup error, never a silent default. */
export function parseTrustedProxyHops(value: unknown): number {
  return HopsSchema.parse(value === '' ? undefined : value);
}

/** Header Better Auth reads its client address from; set by trustClientIp only, never by the client. */
export const CLIENT_IP_HEADER = 'x-charta-client-ip';

/** Replaces any client-written address header by the one resolved with the trusted hops (or removes it). */
export function trustClientIp(
  handler: (request: Request) => Promise<Response>,
  hops: number,
): (request: Request) => Promise<Response> {
  return (request) => {
    const headers = new Headers(request.headers);
    headers.delete(CLIENT_IP_HEADER);
    const ip = clientIp(request, hops);
    if (ip !== null) headers.set(CLIENT_IP_HEADER, ip);
    return handler(new Request(request, { headers }));
  };
}
