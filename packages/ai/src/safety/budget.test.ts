import { describe, expect, it } from 'vitest';
import type { GeminiTransport } from '../gemini/transport.js';
import { withBudget } from './budget.js';

const seen: unknown[] = [];
const base: GeminiTransport = (model, method, body) => {
  seen.push({ model, method, body });
  return Promise.resolve({ ok: true, value: { fine: true } });
};
const limits = { maxCalls: 9, maxInputChars: 10_000, maxOutputTokens: 100 };

describe('withBudget', () => {
  it('refuses calls beyond the call cap with AI_QUOTA, without reaching the transport', async () => {
    seen.length = 0;
    const guarded = withBudget(base, { ...limits, maxCalls: 2 });
    expect((await guarded.transport('gemini-x', 'generateContent', {})).ok).toBe(true);
    expect((await guarded.transport('gemini-x', 'generateContent', {})).ok).toBe(true);
    const third = await guarded.transport('gemini-x', 'generateContent', {});
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.error.code).toBe('AI_QUOTA');
      expect(third.error.message).toContain('budget');
    }
    expect(seen).toHaveLength(2);
    expect(guarded.usage().calls).toBe(2);
  });

  it('refuses a request that would exceed the cumulative input size', async () => {
    const guarded = withBudget(base, { ...limits, maxInputChars: 20 });
    const result = await guarded.transport('gemini-x', 'generateContent', { text: 'x'.repeat(40) });
    expect(result.ok).toBe(false);
  });

  it('caps maxOutputTokens in the generation config', async () => {
    seen.length = 0;
    const guarded = withBudget(base, limits);
    await guarded.transport('gemini-x', 'generateContent', {
      generationConfig: { maxOutputTokens: 9000, temperature: 0.2 },
    });
    await guarded.transport('gemini-x', 'generateContent', { generationConfig: {} });
    const sent = seen.map((call) => JSON.stringify(call));
    expect(sent[0]).toContain('"maxOutputTokens":100');
    expect(sent[0]).toContain('"temperature":0.2');
    expect(sent[1]).toContain('"maxOutputTokens":100');
  });

  it('only talks to Gemini model names, never to an arbitrary path or host', async () => {
    seen.length = 0;
    const guarded = withBudget(base, limits);
    for (const model of ['https://evil.test/x', '../../v1/other', 'gpt-4', 'gemini-3.5 flash']) {
      const result = await guarded.transport(model, 'generateContent', {});
      expect(result.ok).toBe(false);
    }
    expect(seen).toHaveLength(0);
  });
});
