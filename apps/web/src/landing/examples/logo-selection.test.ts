import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOGO_SELECTION } from './data/logo-selection';
import { EXAMPLES } from './index';
import { LogoPickSchema } from './schema';

const PUBLIC = join(import.meta.dirname, '../../../public');

describe('logo selection', () => {
  it('holds twelve to sixteen unique, valid picks', () => {
    expect(LOGO_SELECTION.length).toBeGreaterThanOrEqual(12);
    expect(LOGO_SELECTION.length).toBeLessThanOrEqual(16);
    expect(new Set(LOGO_SELECTION.map((p) => p.id)).size).toBe(LOGO_SELECTION.length);
    for (const pick of LOGO_SELECTION) expect(LogoPickSchema.safeParse(pick).success).toBe(true);
  });

  it('rejects an invented palette entry', () => {
    const [first] = LOGO_SELECTION;
    expect(LogoPickSchema.safeParse({ ...first, palette: ['red'] }).success).toBe(false);
  });

  describe.each(LOGO_SELECTION)('$id', (pick) => {
    it('ships its SVG, whose colours belong to the declared palette', () => {
      const file = join(PUBLIC, pick.logo);
      expect(existsSync(file)).toBe(true);
      const svg = readFileSync(file, 'utf8');
      expect(svg).toMatch(/^<svg\b/u);
      expect(svg).not.toMatch(/<script|on\w+=/iu);
      const found = new Set(
        [...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/gu)].map((m) => m[1]?.toUpperCase()),
      );
      for (const colour of found) expect(pick.palette).toContain(colour);
    });
  });

  describe.each(LOGO_SELECTION)('$id one-colour files', (pick) => {
    it('ships a white and a black file that use only that colour', () => {
      for (const [tone, hex] of [
        ['white', 'FFFFFF'],
        ['black', '000000'],
      ] as const) {
        const url = pick.monoLogos[tone];
        expect(url).toBe(`/demo/logos/mono/${pick.id}-${tone}.svg`);
        const svg = readFileSync(join(PUBLIC, url), 'utf8');
        expect(svg).toMatch(/^<svg\b/u);
        // Knockout masks (inside <defs>) legitimately use black and white: only the painted drawing counts.
        const painted = svg.replace(/<defs>[\s\S]*?<\/defs>/gu, '');
        const colours = [...painted.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/gu)].map((m) =>
          m[1]?.toUpperCase(),
        );
        expect(colours.length).toBeGreaterThan(0);
        for (const colour of colours) expect(colour).toBe(`#${hex}`);
      }
    });
  });

  it('exposes the one-colour files of the logo through each example', () => {
    for (const example of EXAMPLES) {
      if (example.logo.endsWith('.png')) {
        expect(example.monoLogos, example.id).toBeUndefined();
        continue;
      }
      const id = example.logo.replace('/demo/logos/', '').replace('.svg', '');
      expect(example.monoLogos, example.id).toEqual({
        white: `/demo/logos/mono/${id}-white.svg`,
        black: `/demo/logos/mono/${id}-black.svg`,
      });
    }
  });

  it('draws every example logo from a real file, never from an inline drawing', () => {
    for (const example of EXAMPLES) {
      expect(example.logo.startsWith('data:'), example.id).toBe(false);
      expect(existsSync(join(PUBLIC, example.logo)), example.id).toBe(true);
    }
  });
});
