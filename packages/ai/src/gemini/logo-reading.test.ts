import { describe, expect, it } from 'vitest';
import { embedImage, readLogo } from './logo-reading.js';
import type { GeminiTransport } from './transport.js';

const image = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' as const };

const reading = {
  sector: 'restaurant',
  industryLabel: 'Restaurant gastronomique',
  styles: ['elegant', 'warm'],
  letteringType: 'serif-oldstyle',
  typefaceGuess: 'Cormorant',
  searchKeywords: ['fine dining', 'gold foil'],
};

function scripted(replies: unknown[]): { transport: GeminiTransport; bodies: unknown[] } {
  const bodies: unknown[] = [];
  const transport: GeminiTransport = (_model, _method, body) => {
    bodies.push(body);
    return Promise.resolve({ ok: true, value: replies.shift() });
  };
  return { transport, bodies };
}

const asCandidate = (value: unknown) => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
});

describe('readLogo', () => {
  it('returns the validated reading of the logo', async () => {
    const { transport } = scripted([asCandidate(reading)]);
    const result = await readLogo(transport, image, 'gemini-test');
    expect(result).toEqual({ ok: true, value: reading });
  });

  it('retries once with the validation error, then reports AI_OUTPUT_INVALID', async () => {
    const { transport, bodies } = scripted([
      asCandidate({ ...reading, sector: 'spaceships' }),
      asCandidate({ ...reading, styles: [] }),
    ]);
    const result = await readLogo(transport, image, 'gemini-test');
    expect(bodies).toHaveLength(2);
    expect(JSON.stringify(bodies[1])).toContain('previous answer was invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AI_OUTPUT_INVALID');
  });

  it('accepts "other" when the logo fits no library sector', async () => {
    const { transport } = scripted([
      asCandidate({ ...reading, sector: 'other', typefaceGuess: null }),
    ]);
    const result = await readLogo(transport, image, 'gemini-test');
    expect(result.ok && result.value.sector).toBe('other');
  });
});

describe('readLogo tolerance', () => {
  it('cleans keywords and styles instead of failing the whole reading', async () => {
    const { transport } = scripted([
      asCandidate({
        ...reading,
        styles: ['warm', 'warm'],
        searchKeywords: ['', 'x'.repeat(50), 'Fine Dining', 'a', 'b', 'c', 'd', 'e', 'f'],
      }),
    ]);
    const result = await readLogo(transport, image, 'gemini-test');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.styles).toEqual(['warm']);
    expect(result.value.searchKeywords).toEqual(['Fine Dining', 'a', 'b', 'c', 'd', 'e']);
  });
});

describe('embedImage', () => {
  it('returns the embedding vector at the requested size', async () => {
    const values = Array.from({ length: 768 }, (_, index) => index / 768);
    const { transport, bodies } = scripted([{ embedding: { values } }]);
    const result = await embedImage(transport, image, 768);
    expect(result).toEqual({ ok: true, value: values });
    expect(JSON.stringify(bodies[0])).toContain('"outputDimensionality":768');
  });

  it('refuses a vector of the wrong size', async () => {
    const { transport } = scripted([{ embedding: { values: [0.1, 0.2] } }]);
    const result = await embedImage(transport, image, 768);
    expect(result.ok).toBe(false);
  });
});
