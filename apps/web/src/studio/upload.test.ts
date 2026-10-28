import { describe, expect, it } from 'vitest';
import { startAnalysis, uploadLogo } from './upload';

const PROJECT = '0190a0b0-0000-7000-8000-00000000000a';
const ASSET = '0190a0b0-0000-7000-8000-000000000001';
const PUT_URL = 'https://bucket.r2.example/key?X-Amz-Signature=abc';

const asset = (status: string, rejectReason: string | null = null) => ({
  id: ASSET,
  projectId: PROJECT,
  kind: 'logo_original',
  status,
  mime: null,
  bytes: 3,
  width: null,
  height: null,
  rejectReason,
  createdAt: '2026-10-28T10:00:00.000Z',
});
const declared = {
  asset: asset('pending'),
  upload: {
    url: PUT_URL,
    method: 'PUT',
    headers: { 'content-length': '3' },
    expiresAt: '2026-10-28T10:05:00.000Z',
  },
};
const problem = (status: number, code: string) =>
  Response.json({ type: '/errors/x', title: code, status, code, detail: 'x' }, { status });

interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: unknown;
}

/** A fetch double answering the three calls in order and recording them. */
function server(...answers: Array<Response | Error>) {
  const calls: Call[] = [];
  const fetcher = (input: string, init?: RequestInit): Promise<Response> => {
    calls.push({
      url: input,
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: init?.body,
    });
    const answer = answers.shift();
    if (answer === undefined) return Promise.reject(new Error('unexpected call'));
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  };
  return { calls, fetcher };
}

const file = new File([Uint8Array.from([1, 2, 3])], 'logo.svg', { type: 'image/svg+xml' });

describe('uploadLogo (04 §3: declare, presigned PUT, complete)', () => {
  it('declares the file, sends its bytes with the signed headers, then completes', async () => {
    const { calls, fetcher } = server(
      Response.json(declared, { status: 201 }),
      new Response(null, { status: 200 }),
      Response.json({ asset: asset('quarantined') }, { status: 202 }),
    );
    const result = await uploadLogo(fetcher, PROJECT, file);

    expect(result).toEqual({ ok: true, value: { assetId: ASSET, status: 'quarantined' } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST /api/v1/projects/${PROJECT}/assets/uploads`,
      `PUT ${PUT_URL}`,
      `POST /api/v1/assets/${ASSET}/complete`,
    ]);
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      kind: 'logo_original',
      fileName: 'logo.svg',
      bytes: 3,
    });
    expect(calls[1]?.headers.get('content-length')).toBe('3');
    expect(calls[1]?.body).toBe(file);
  });

  it('reports a rejection decided at completion with its reason', async () => {
    const { fetcher } = server(
      Response.json(declared, { status: 201 }),
      new Response(null, { status: 200 }),
      Response.json({ asset: asset('rejected', 'ASSET_TOO_LARGE') }),
    );
    expect(await uploadLogo(fetcher, PROJECT, file)).toEqual({
      ok: false,
      error: { kind: 'rejected', code: 'ASSET_TOO_LARGE' },
    });
  });

  it('passes the problem code of a refused declaration (rate limit, access)', async () => {
    const { calls, fetcher } = server(problem(429, 'RATE_LIMITED'));
    expect(await uploadLogo(fetcher, PROJECT, file)).toEqual({
      ok: false,
      error: { kind: 'http', status: 429, code: 'RATE_LIMITED' },
    });
    expect(calls).toHaveLength(1);
  });

  it('stops when the storage refuses the bytes', async () => {
    const { calls, fetcher } = server(
      Response.json(declared, { status: 201 }),
      new Response('<Error/>', { status: 403 }),
    );
    expect(await uploadLogo(fetcher, PROJECT, file)).toEqual({
      ok: false,
      error: { kind: 'storage', status: 403 },
    });
    expect(calls).toHaveLength(2);
  });

  it('turns a lost connection into a network failure', async () => {
    const { fetcher } = server(new TypeError('Failed to fetch'));
    expect(await uploadLogo(fetcher, PROJECT, file)).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });

  it('refuses an answer that does not match the contract', async () => {
    const { fetcher } = server(Response.json({ asset: { id: 'nope' } }, { status: 201 }));
    expect(await uploadLogo(fetcher, PROJECT, file)).toEqual({
      ok: false,
      error: { kind: 'http', status: 201, code: 'INVALID_RESPONSE' },
    });
  });
});

describe('startAnalysis (04 §3, §8)', () => {
  it('sends the idempotency key and passes the refusal code', async () => {
    const { calls, fetcher } = server(
      Response.json({ analysis: { id: ASSET, status: 'pending' } }, { status: 202 }),
      problem(409, 'LOGO_NOT_READY'),
    );
    expect(await startAnalysis(fetcher, PROJECT, 'k1')).toEqual({ ok: true, value: undefined });
    expect(calls[0]?.headers.get('idempotency-key')).toBe('k1');
    expect(calls[0]?.url).toBe(`/api/v1/projects/${PROJECT}/analyze`);
    expect(await startAnalysis(fetcher, PROJECT, 'k2')).toEqual({
      ok: false,
      error: { kind: 'http', status: 409, code: 'LOGO_NOT_READY' },
    });
  });
});
