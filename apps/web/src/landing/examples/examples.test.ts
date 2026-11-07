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

  it('rejects a palette that is not hexadecimal', () => {
    const broken = {
      ...example,
      colors: { ...example.colors, primary: { hex: 'blue', source: 'extracted' } },
    };
    expect(DemoExampleSchema.safeParse(broken).success).toBe(false);
  });
});
