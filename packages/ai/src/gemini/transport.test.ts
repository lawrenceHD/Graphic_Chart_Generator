import { describe, expect, it } from 'vitest';
import { createGeminiTransport } from './transport.js';

type Reply = { status: number; body: unknown };

function fakeFetch(replies: Reply[]) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetch = (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, headers: init.headers });
    const reply = replies.shift() ?? { status: 500, body: {} };
    return Promise.resolve(new Response(JSON.stringify(reply.body), { status: reply.status }));
  };
  return { fetch, calls };
}

const noSleep = (): Promise<void> => Promise.resolve();

describe('createGeminiTransport', () => {
  it('sends the key in a header, never in the URL', async () => {
    const { fetch, calls } = fakeFetch([{ status: 200, body: { ok: true } }]);
    const transport = createGeminiTransport({ apiKey: 'secret-key', fetch, sleep: noSleep });
    const result = await transport('gemini-test', 'generateContent', {});
    expect(result).toEqual({ ok: true, value: { ok: true } });
    expect(calls[0]?.url).not.toContain('secret-key');
    expect(calls[0]?.headers['x-goog-api-key']).toBe('secret-key');
  });

  it('retries transient failures, then succeeds', async () => {
    const { fetch, calls } = fakeFetch([
      { status: 503, body: {} },
      { status: 429, body: { error: { message: 'per minute' } } },
      { status: 200, body: { done: 1 } },
    ]);
    const transport = createGeminiTransport({ apiKey: 'k', fetch, sleep: noSleep });
    expect(await transport('m', 'generateContent', {})).toEqual({ ok: true, value: { done: 1 } });
    expect(calls).toHaveLength(3);
  });

  it('stops at once with AI_QUOTA when the daily free quota is spent', async () => {
    const { fetch, calls } = fakeFetch([
      {
        status: 429,
        body: { error: { message: 'Quota exceeded: GenerateRequestsPerDayPerProject' } },
      },
    ]);
    const transport = createGeminiTransport({ apiKey: 'k', fetch, sleep: noSleep });
    const result = await transport('m', 'generateContent', {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AI_QUOTA');
    expect(calls).toHaveLength(1);
  });

  it('gives up with AI_UNAVAILABLE after the retry budget, without leaking the key', async () => {
    const { fetch, calls } = fakeFetch([
      { status: 500, body: {} },
      { status: 500, body: {} },
      { status: 500, body: {} },
    ]);
    const transport = createGeminiTransport({ apiKey: 'secret-key', fetch, sleep: noSleep });
    const result = await transport('m', 'generateContent', {});
    expect(calls).toHaveLength(3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AI_UNAVAILABLE');
      expect(result.error.message).not.toContain('secret-key');
    }
  });

  it('does not retry a request the API refused as invalid', async () => {
    const { fetch, calls } = fakeFetch([{ status: 400, body: { error: { message: 'bad' } } }]);
    const transport = createGeminiTransport({ apiKey: 'k', fetch, sleep: noSleep });
    const result = await transport('m', 'generateContent', {});
    expect(calls).toHaveLength(1);
    if (!result.ok) expect(result.error.code).toBe('AI_REQUEST_REJECTED');
  });
});

describe('createGeminiTransport hardening', () => {
  it('waits as long as Retry-After asks before retrying a per-minute limit', async () => {
    const waits: number[] = [];
    const replies = [
      new Response('{}', { status: 429, headers: { 'retry-after': '7' } }),
      new Response('{"ok":1}', { status: 200 }),
    ];
    const transport = createGeminiTransport({
      apiKey: 'k',
      fetch: () => Promise.resolve(replies.shift() ?? new Response('{}', { status: 500 })),
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    expect((await transport('m', 'generateContent', {})).ok).toBe(true);
    expect(waits).toEqual([7000]);
  });

  it('redacts the key if the server echoes it back', async () => {
    const { fetch } = fakeFetch([
      { status: 400, body: { error: { message: 'key secret-key invalid' } } },
    ]);
    const transport = createGeminiTransport({ apiKey: 'secret-key', fetch, sleep: noSleep });
    const result = await transport('m', 'generateContent', {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).not.toContain('secret-key');
  });
});
