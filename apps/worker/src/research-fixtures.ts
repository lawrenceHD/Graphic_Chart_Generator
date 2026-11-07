import type { GeminiTransport } from '@app/ai';
import type { IndexedReference } from '@app/contracts';

// Simulated Gemini and corpus for the tests of the research: no network, no spend.
const DIMENSIONS = 64;
export const axis = (index: number): number[] =>
  Array.from({ length: DIMENSIONS }, (_, position) => (position === index ? 1 : 0));

const reference = (id: string, embedding: number[]): IndexedReference => ({
  id,
  sector: 'restaurant',
  file: `restaurant/${id}.jpg`,
  card: {
    kind: 'brand-board',
    sections: ['menu', 'logo', 'palette'],
    mockups: [],
    styles: ['minimal'],
    headingType: 'grotesque-sans',
    bodyType: 'grotesque-sans',
    whitespace: 'balanced',
    background: 'light',
    palette: ['#1F3A2E'],
    quality: 4,
    insight: 'Generic insight.',
  },
  embedding,
  model: { vision: 'test', embedding: 'gemini-embedding-2', dimensions: DIMENSIONS },
});

export const indexText = [reference('menu-1', axis(0)), reference('menu-2', axis(1))]
  .map((entry) => JSON.stringify(entry))
  .join('\n');

const reading = {
  sector: 'restaurant',
  industryLabel: 'Restaurant',
  styles: ['warm'],
  letteringType: 'serif-oldstyle',
  typefaceGuess: null,
  searchKeywords: ['fine dining'],
};

export interface CountingTransport {
  readonly transport: GeminiTransport;
  readonly calls: () => number;
}

/** Answers the reading and the embedding of the logo; counts every call. */
export function okTransport(): CountingTransport {
  let calls = 0;
  return {
    calls: () => calls,
    transport: (_model, method) => {
      calls += 1;
      return Promise.resolve(
        method === 'embedContent'
          ? { ok: true, value: { embedding: { values: axis(0) } } }
          : {
              ok: true,
              value: {
                candidates: [{ content: { parts: [{ text: JSON.stringify(reading) }] } }],
              },
            },
      );
    },
  };
}

/** The daily quota is spent. */
export function quotaTransport(): CountingTransport {
  let calls = 0;
  return {
    calls: () => calls,
    transport: () => {
      calls += 1;
      return Promise.resolve({ ok: false, error: { code: 'AI_QUOTA', message: 'daily quota' } });
    },
  };
}
