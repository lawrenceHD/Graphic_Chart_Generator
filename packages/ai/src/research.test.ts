import { describe, expect, it } from 'vitest';
import { loadFontCatalogue } from './fonts/catalogue.js';
import { recommendPairings } from './fonts/recommend.js';
import type { GeminiTransport } from './gemini/transport.js';
import { direction, reference } from './references/fixtures.js';
import { buildDeepQueries, researchBrand } from './research.js';

const image = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' as const };
// The typeface the engine would put first: guessing it as the logo's lettering must push it out.
const favourite =
  recommendPairings(
    { heading: 'didone', body: 'humanist-sans', styles: ['elegant', 'warm'] },
    loadFontCatalogue(),
  )[0]?.heading.family ?? '';
const reading = {
  sector: 'restaurant',
  industryLabel: 'Restaurant gastronomique',
  styles: ['elegant', 'warm'],
  letteringType: 'serif-oldstyle',
  typefaceGuess: favourite,
  searchKeywords: ['fine dining', 'gold foil'],
};
const library = [
  reference('menu-1', 'restaurant', direction(0), {
    sections: ['menu', 'signage'],
    mockups: ['menu card', 'storefront sign'],
    styles: ['elegant', 'warm'],
    headingType: 'didone',
    bodyType: 'humanist-sans',
  }),
  reference('bank', 'finance', direction(7), { styles: ['corporate'] }),
];

function transportWith(embedding: 'ok' | 'fail'): GeminiTransport {
  return (_model, method) => {
    if (method === 'embedContent') {
      return Promise.resolve(
        embedding === 'ok'
          ? { ok: true, value: { embedding: { values: direction(0) } } }
          : { ok: false, error: { code: 'AI_UNAVAILABLE', message: 'down' } },
      );
    }
    return Promise.resolve({
      ok: true,
      value: { candidates: [{ content: { parts: [{ text: JSON.stringify(reading) }] } }] },
    });
  };
}

const deps = (embedding: 'ok' | 'fail') => ({
  transport: transportWith(embedding),
  visionModel: 'gemini-test',
  library,
  catalogue: loadFontCatalogue(),
});

describe('researchBrand', () => {
  it('turns a logo into a sourced art direction, typeface pairings and deep-search queries', async () => {
    const result = await researchBrand(deps('ok'), { logo: image, palette: ['#7A1F2B'] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const research = result.value;
    expect(research.reading.sector).toBe('restaurant');
    expect(research.direction.references[0]?.id).toBe('menu-1');
    expect(research.direction.sections.find((entry) => entry.section === 'menu')?.evidence).toEqual(
      ['menu-1'],
    );
    expect(favourite).not.toBe('');
    expect(research.pairings.length).toBeGreaterThan(0);
    for (const pairing of research.pairings) {
      expect(pairing.heading.family).not.toBe(favourite);
    }
    expect(research.deepQueries).toContain('menu card mockup elegant restaurant');
    expect(research.warnings).toEqual([]);
  });

  it('keeps researching without visual similarity when the embedding fails, and says so', async () => {
    const result = await researchBrand(deps('fail'), { logo: image, palette: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.warnings).toEqual(['visual-similarity-unavailable']);
    expect(result.value.direction.references[0]?.id).toBe('menu-1');
  });
});

describe('researchBrand boundaries', () => {
  it('refuses an invalid palette with an error instead of throwing', async () => {
    const result = await researchBrand(deps('ok'), { logo: image, palette: ['red'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AI_REQUEST_REJECTED');
  });

  it('skips visual similarity when the library was embedded by another model, and says so', async () => {
    const foreign = library.map((entry) => ({
      ...entry,
      model: { ...entry.model, embedding: 'other-model' },
    }));
    const result = await researchBrand(
      { ...deps('ok'), library: foreign },
      { logo: image, palette: [] },
    );
    expect(result.ok && result.value.warnings).toEqual(['library-embedding-mismatch']);
    expect(result.ok && result.value.direction.references.length).toBeGreaterThan(0);
  });
});

describe('buildDeepQueries', () => {
  it('writes specific, deduplicated queries from the reading and the planned mockups', () => {
    const queries = buildDeepQueries(
      {
        sector: 'cafe-bakery',
        industryLabel: 'Boulangerie',
        styles: ['handcrafted'],
        letteringType: 'script',
        typefaceGuess: null,
        searchKeywords: ['artisan bakery', 'artisan bakery'],
      },
      ['paper bag', 'coffee cup'],
    );
    expect(queries).toEqual([
      'cafe bakery brand identity handcrafted',
      'cafe bakery brand guidelines',
      'paper bag mockup handcrafted cafe bakery',
      'coffee cup mockup handcrafted cafe bakery',
      'script logo brand identity cafe bakery',
      'artisan bakery branding',
    ]);
  });
});
