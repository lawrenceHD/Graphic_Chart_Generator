import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createR2Storage } from './r2-storage.js';

const config = {
  accountId: 'acct0123',
  accessKeyId: 'AKIDTEST',
  secretAccessKey: 'test-only-secret',
  bucket: 'atelier-test',
};
const now = (): Date => new Date('2026-10-18T10:00:00.000Z');

// Independent SigV4 check (AWS "Authenticating requests: query parameters"), so that the test fails if the
// adapter signs the wrong headers, scope or expiry, not merely if it changes its output.
const rfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
const hmac = (key: Buffer | string, data: string): Buffer =>
  createHmac('sha256', key).update(data).digest();

function expectedSignature(url: URL, method: string, headers: Record<string, string>): string {
  const params = [...url.searchParams].filter(([name]) => name !== 'X-Amz-Signature');
  const query = params
    .map(([name, value]) => `${rfc3986(name)}=${rfc3986(value)}`)
    .sort()
    .join('&');
  const all: Record<string, string> = { host: url.host, ...headers };
  const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';');
  const canonicalHeaders = signed.map((name) => `${name}:${all[name] ?? ''}\n`).join('');
  const canonical = [
    method,
    url.pathname,
    query,
    canonicalHeaders,
    signed.join(';'),
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const datetime = url.searchParams.get('X-Amz-Date') ?? '';
  const scope = `${datetime.slice(0, 8)}/auto/s3/aws4_request`;
  const toSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    scope,
    createHash('sha256').update(canonical).digest('hex'),
  ].join('\n');
  let key = hmac(`AWS4${config.secretAccessKey}`, datetime.slice(0, 8));
  for (const part of ['auto', 's3', 'aws4_request']) key = hmac(key, part);
  return createHmac('sha256', key).update(toSign).digest('hex');
}

type Seen = { url: string; method: string; headers: Headers; body: unknown };
function fakeFetch(respond: (seen: Seen) => Response, log: Seen[] = []): typeof fetch {
  return (input, init) => {
    const seen = {
      url: typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: init?.body,
    };
    log.push(seen);
    return Promise.resolve(respond(seen));
  };
}
const unused = fakeFetch(() => {
  throw new Error('no network expected');
});

describe('R2 storage adapter', () => {
  it('presigns a 5-minute PUT that binds the exact size', async () => {
    const storage = createR2Storage(config, now, unused);
    const upload = await storage.presignPut('projects/p1/assets/a1/original', 1234);
    const url = new URL(upload.url);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://acct0123.r2.cloudflarestorage.com/atelier-test/projects/p1/assets/a1/original',
    );
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;host');
    expect(url.searchParams.get('X-Amz-Credential')).toBe('AKIDTEST/20261018/auto/s3/aws4_request');
    expect(upload.headers).toEqual({ 'content-length': '1234' });
    expect(upload.expiresAt.toISOString()).toBe('2026-10-18T10:05:00.000Z');
    expect(url.searchParams.get('X-Amz-Signature')).toBe(
      expectedSignature(url, 'PUT', { 'content-length': '1234' }),
    );
  });

  it('presigns a GET that forces type and disposition', async () => {
    const storage = createR2Storage(config, now, unused);
    const url = new URL(
      await storage.presignGet('k/logo.svg', {
        contentType: 'image/svg+xml',
        disposition: 'inline',
      }),
    );
    expect(url.searchParams.get('response-content-type')).toBe('image/svg+xml');
    expect(url.searchParams.get('response-content-disposition')).toBe('inline');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toBe(expectedSignature(url, 'GET', {}));
  });

  it('refuses keys it did not generate', async () => {
    const storage = createR2Storage(config, now, unused);
    await expect(storage.presignPut('../other-bucket/x', 1)).rejects.toThrow(RangeError);
    await expect(storage.head('a b')).rejects.toThrow(RangeError);
  });

  it('reads the size of an object, null when absent, throws on server errors', async () => {
    const sized = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(null, { headers: { 'content-length': '42' } })),
    );
    expect(await sized.head('k')).toEqual({ bytes: 42 });
    const absent = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(null, { status: 404 })),
    );
    expect(await absent.head('k')).toBeNull();
    const failing = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(null, { status: 500 })),
    );
    await expect(failing.head('k')).rejects.toThrow('R2 HEAD failed with status 500');
  });

  it('reads bytes within the limit and refuses larger bodies, announced or not', async () => {
    const body = new Uint8Array([1, 2, 3, 4, 5]);
    const ok = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(body)),
    );
    expect(await ok.get('k', 5)).toEqual({ ok: true, value: body });
    expect(await ok.get('k', 4)).toEqual({ ok: false, error: 'TOO_LARGE' });
    const announced = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(body, { headers: { 'content-length': '999' } })),
    );
    expect(await announced.get('k', 10)).toEqual({ ok: false, error: 'TOO_LARGE' });
    const absent = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(null, { status: 404 })),
    );
    expect(await absent.get('k', 10)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('writes and deletes with signed requests', async () => {
    const log: Seen[] = [];
    const storage = createR2Storage(
      config,
      now,
      fakeFetch(() => new Response(null), log),
    );
    await storage.put('k/out.svg', new Uint8Array([60, 115]), 'image/svg+xml');
    await storage.delete('k/out.svg');
    expect(log.map((seen) => seen.method)).toEqual(['PUT', 'DELETE']);
    expect(log[0]?.headers.get('content-type')).toBe('image/svg+xml');
    expect(log[0]?.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDTEST\//);
    expect(log[0]?.body).toEqual(new Uint8Array([60, 115]));
  });
});
