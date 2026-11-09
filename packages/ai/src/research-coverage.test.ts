import { describe, expect, it } from 'vitest';
import { loadFontCatalogue } from './fonts/catalogue.js';
import type { GeminiTransport } from './gemini/transport.js';
import { direction, reference } from './references/fixtures.js';
import { researchBrand } from './research.js';

const image = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' as const };
const reading = {
  sector: 'finance',
  industryLabel: 'Banque',
  styles: ['corporate'],
  letteringType: 'grotesque-sans',
  typefaceGuess: null,
  searchKeywords: ['private bank'],
};
const transport: GeminiTransport = (_model, method) =>
  Promise.resolve(
    method === 'embedContent'
      ? { ok: true, value: { embedding: { values: direction(0) } } }
      : {
          ok: true,
          value: { candidates: [{ content: { parts: [{ text: JSON.stringify(reading) }] } }] },
        },
  );
const library = [
  reference('bakery', 'cafe-bakery', direction(0), { kind: 'mockup-scene' }),
  reference('spread', 'cafe-bakery', direction(0, 1, 0.1), { kind: 'guideline-spread' }),
];
const deps = { transport, visionModel: 'gemini-test', library, catalogue: loadFontCatalogue() };

describe('researchBrand: library coverage', () => {
  it('says when no indexed reference belongs to the sector of the brand', async () => {
    const result = await researchBrand(deps, { logo: image, palette: ['#1F3A2E'] });
    expect(result.ok && result.value.warnings).toEqual(['sector-not-indexed']);
  });

  it('stays silent when the library has references of the sector', async () => {
    const covered = [...library, reference('bank', 'finance', direction(3))];
    const result = await researchBrand(
      { ...deps, library: covered },
      { logo: image, palette: ['#1F3A2E'] },
    );
    expect(result.ok && result.value.warnings).toEqual([]);
  });

  it('searches for guideline spreads by default and for mockup scenes on request', async () => {
    const charter = await researchBrand(deps, { logo: image, palette: [] });
    const mockups = await researchBrand(deps, { logo: image, palette: [], purpose: 'mockups' });
    expect(charter.ok && charter.value.direction.references[0]?.id).toBe('spread');
    expect(mockups.ok && mockups.value.direction.references[0]?.id).toBe('bakery');
  });
});
