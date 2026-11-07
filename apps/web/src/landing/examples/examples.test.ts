import { describe, expect, it } from 'vitest';
import { orderedPages } from '../../studio/workspace/brand-view';
import { buildExample } from './build';
import { DemoExampleSchema } from './schema';
import { DEFAULT_EXAMPLE_ID, EXAMPLES, getExample } from './index';

describe('example set', () => {
  it('offers at least three brands from three different sectors, with unique ids', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(EXAMPLES.map((example) => example.id)).size).toBe(EXAMPLES.length);
    expect(new Set(EXAMPLES.map((example) => example.sector)).size).toBe(EXAMPLES.length);
  });

  it('knows its default and refuses an unknown id', () => {
    expect(getExample(DEFAULT_EXAMPLE_ID)?.id).toBe(DEFAULT_EXAMPLE_ID);
    expect(getExample('does-not-exist')).toBeUndefined();
  });

  it('gives every brand its own primary colour and its own type pairing', () => {
    expect(new Set(EXAMPLES.map((example) => example.colors.primary.hex.toLowerCase())).size).toBe(
      EXAMPLES.length,
    );
    expect(new Set(EXAMPLES.map((example) => example.pairingId)).size).toBe(EXAMPLES.length);
  });

  it('covers hospitality, bakery, consulting, beauty and food production', () => {
    expect(EXAMPLES.map((example) => example.id)).toEqual(
      expect.arrayContaining(['maison-alba', 'halden-advisory', 'atelier-nacre', 'harrow-fields']),
    );
    expect(EXAMPLES).toHaveLength(5);
  });

  it('offers both guideline languages', () => {
    expect(new Set(EXAMPLES.map((example) => example.language))).toEqual(new Set(['fr', 'en']));
  });
});

describe.each(EXAMPLES)('example $id', (example) => {
  it('satisfies the DemoExample schema', () => {
    expect(DemoExampleSchema.safeParse(example).success).toBe(true);
  });

  it('is found by its identifier', () => {
    expect(getExample(example.id)).toBe(example);
  });

  it('composes a valid guideline carrying its own name, palette and fonts', () => {
    const built = buildExample(example);
    expect(built.view.name).toBe(example.name);
    expect(built.view.sector).toBe(example.sector);
    expect(built.view.colors.primary).toBe(example.colors.primary.hex);
    expect(built.view.colors.accent).toBe(example.colors.accent.hex);
    expect(built.view.mission).toBe(example.mission);
    expect(built.view.language).toBe(example.language);
    expect(built.view.logo.color).toBe(example.logo);
    expect(orderedPages(built.document).length).toBeGreaterThan(8);
  });

  it('draws a logo that is a self-contained image, without script or remote reference', () => {
    if (!example.logo.startsWith('data:image/svg+xml')) return;
    const svg = decodeURIComponent(example.logo.slice(example.logo.indexOf(',') + 1));
    expect(svg).toMatch(/^<svg\b/u);
    expect(svg).not.toMatch(/<script|href=|on\w+=/iu);
  });

  it('draws its black and white versions, when it has them, in a single flat colour', () => {
    const { monoLogos } = example;
    if (monoLogos === undefined) return;
    for (const [uri, ink] of [
      [monoLogos.black, '#000000'],
      [monoLogos.white, '#FFFFFF'],
    ] as const) {
      const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
      const fills = [...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6}|none)"/gu)].map(
        (m) => m[1],
      );
      expect(fills.length).toBeGreaterThan(0);
      for (const fill of fills)
        expect(['none', ink]).toContain(fill?.toUpperCase().replace('NONE', 'none'));
    }
    expect(buildExample(example).view.logo['mono-black']).toBe(monoLogos.black);
    expect(buildExample(example).view.logo['mono-white']).toBe(monoLogos.white);
  });

  it('rejects a palette that is not hexadecimal', () => {
    const broken = {
      ...example,
      colors: { ...example.colors, primary: { hex: 'blue', source: 'extracted' } },
    };
    expect(DemoExampleSchema.safeParse(broken).success).toBe(false);
  });
});
