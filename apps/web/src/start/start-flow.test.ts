import { describe, expect, it } from 'vitest';
import { startProject } from './start-flow';

type Call = { readonly url: string; readonly body: unknown };
const PROJECT_ID = '0190a0b0-0000-7000-8000-00000000000a';

function fakeApi(answers: Record<string, readonly Response[]>) {
  const calls: Call[] = [];
  const fetcher = (url: string, init?: RequestInit): Promise<Response> => {
    const text = typeof init?.body === 'string' ? init.body : 'null';
    calls.push({ url, body: JSON.parse(text) });
    const queue = answers[url];
    const next = queue?.[calls.filter((call) => call.url === url).length - 1];
    if (next === undefined) return Promise.reject(new TypeError('offline'));
    return Promise.resolve(next);
  };
  return { calls, fetcher };
}

const created = () => Response.json({ project: { id: PROJECT_ID } }, { status: 201 });
const problem = (status: number, code: string) => Response.json({ code }, { status });
const token = () => Promise.resolve('turnstile-token');

describe('startProject', () => {
  it('creates the project directly when a session already exists', async () => {
    const api = fakeApi({ '/api/v1/projects': [created()] });
    const result = await startProject(api.fetcher, { title: 'La Mèza', briefText: 'Brief' }, token);
    expect(result).toEqual({ ok: true, value: PROJECT_ID });
    expect(api.calls).toEqual([
      { url: '/api/v1/projects', body: { title: 'La Mèza', briefText: 'Brief', language: 'fr' } },
    ]);
  });

  it('opens a guest session with the anti-bot token, then retries once', async () => {
    const api = fakeApi({
      '/api/v1/projects': [problem(401, 'UNAUTHENTICATED'), created()],
      '/api/v1/guest-sessions': [Response.json({ expiresAt: 'x' }, { status: 201 })],
    });
    const result = await startProject(api.fetcher, { title: 'La Mèza' }, token);
    expect(result).toEqual({ ok: true, value: PROJECT_ID });
    expect(api.calls.map((call) => call.url)).toEqual([
      '/api/v1/projects',
      '/api/v1/guest-sessions',
      '/api/v1/projects',
    ]);
    expect(api.calls[1]?.body).toEqual({ turnstileToken: 'turnstile-token' });
  });

  it('starts a fresh guest session when the current one already holds its project', async () => {
    const api = fakeApi({
      '/api/v1/projects': [problem(403, 'FORBIDDEN'), created()],
      '/api/v1/guest-sessions': [Response.json({ expiresAt: 'x' }, { status: 201 })],
    });
    expect(await startProject(api.fetcher, { title: 'A' }, token)).toEqual({
      ok: true,
      value: PROJECT_ID,
    });
  });

  it('reports a refused anti-bot check without creating anything', async () => {
    const api = fakeApi({
      '/api/v1/projects': [problem(401, 'UNAUTHENTICATED')],
      '/api/v1/guest-sessions': [problem(403, 'TURNSTILE_FAILED')],
    });
    expect(await startProject(api.fetcher, { title: 'A' }, token)).toEqual({
      ok: false,
      error: { kind: 'http', status: 403, code: 'TURNSTILE_FAILED' },
    });
    expect(api.calls).toHaveLength(2);
  });

  it('reports a missing anti-bot token and a lost network', async () => {
    const noToken = fakeApi({ '/api/v1/projects': [problem(401, 'UNAUTHENTICATED')] });
    expect(
      await startProject(noToken.fetcher, { title: 'A' }, () => Promise.resolve(null)),
    ).toEqual({ ok: false, error: { kind: 'turnstile' } });
    const offline = fakeApi({});
    expect(await startProject(offline.fetcher, { title: 'A' }, token)).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });

  it('does not loop when the retry is refused again', async () => {
    const api = fakeApi({
      '/api/v1/projects': [problem(401, 'UNAUTHENTICATED'), problem(429, 'RATE_LIMITED')],
      '/api/v1/guest-sessions': [Response.json({ expiresAt: 'x' }, { status: 201 })],
    });
    expect(await startProject(api.fetcher, { title: 'A' }, token)).toEqual({
      ok: false,
      error: { kind: 'http', status: 429, code: 'RATE_LIMITED' },
    });
  });

  it('refuses an answer outside the contract', async () => {
    const api = fakeApi({ '/api/v1/projects': [Response.json({ project: {} }, { status: 201 })] });
    expect(await startProject(api.fetcher, { title: 'A' }, token)).toEqual({
      ok: false,
      error: { kind: 'http', status: 201, code: 'INVALID_RESPONSE' },
    });
  });
});
