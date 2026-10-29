import { contrastRatio, hexToOklch } from '@app/color-engine';
import type { Rect } from '@app/contracts';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { clearSpace, clearSpaceDiagramSvg } from './clear-space.js';
import { DONT_KINDS, dosAndDontsSvg, offPaletteHue, STRIKE_RED } from './dos-donts.js';
import { faviconSvg } from './favicon.js';

const rasterizer = createNodeRasterizer();
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
function logo(box: Rect, fill = '#1F4BFF'): string {
  const body = `<rect x="${String(box.x)}" y="${String(box.y)}" width="${String(box.width)}" height="${String(box.height)}" fill="${fill}"/>`;
  const result = sanitizeSvg(
    encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`),
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
const accepted = (svg: string): boolean => {
  const result = sanitizeSvg(encode(svg));
  return result.ok && result.value.svg === svg;
};
const hueGap = (a: number, b: number): number =>
  Math.min(Math.abs(a - b) % 360, 360 - (Math.abs(a - b) % 360));
const palette = {
  primary: '#1F4BFF',
  accent: '#DAA500',
  neutralLight: '#F2F5FC',
  neutralDark: '#12161F',
  extra: [],
};

describe('faviconSvg (05_ENGINES.md §5.4)', () => {
  it.each([
    { x: 25, y: 25, width: 50, height: 50 },
    { x: 10, y: 30, width: 80, height: 40 },
    { x: 30, y: 10, width: 40, height: 80 },
    { x: 5, y: 40, width: 90, height: 20 },
    { x: 40, y: 5, width: 20, height: 90 },
  ])('1. the logo fills 80 % ± 1 % of the longest side, centred (box %o)', async (box) => {
    const favicon = faviconSvg(logo(box), box);
    if (!favicon.ok) throw new Error(favicon.error);
    const measured = await rasterizer.bbox(favicon.value.svg);
    if (!measured.ok) throw new Error(measured.error.reason);
    const { size } = favicon.value;
    const content = measured.value;

    expect(Math.max(content.width, content.height) / size).toBeGreaterThanOrEqual(0.79);
    expect(Math.max(content.width, content.height) / size).toBeLessThanOrEqual(0.81);
    expect(Math.abs(content.x + content.width / 2 - size / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(content.y + content.height / 2 - size / 2)).toBeLessThanOrEqual(0.5);
    expect(accepted(favicon.value.svg)).toBe(true);
  });

  it('6. warns on extreme aspect ratios only', () => {
    const wide = faviconSvg(logo({ x: 0, y: 0, width: 300, height: 100 }), {
      x: 0,
      y: 0,
      width: 300,
      height: 100,
    });
    const fine = faviconSvg(logo({ x: 0, y: 0, width: 150, height: 100 }), {
      x: 0,
      y: 0,
      width: 150,
      height: 100,
    });
    expect(wide.ok && wide.value.warnings).toEqual(['FAVICON_EXTREME_ASPECT']);
    expect(fine.ok && fine.value.warnings).toEqual([]);
  });

  it('draws an optional rounded background (radius 18 % of S)', () => {
    const box = { x: 25, y: 25, width: 50, height: 50 };
    const favicon = faviconSvg(logo(box), box, { background: '#FFD60A' });
    if (!favicon.ok) throw new Error(favicon.error);
    expect(favicon.value.svg).toContain('fill="#FFD60A"');
    expect(favicon.value.svg).toContain(`rx="${String(favicon.value.size * 0.18)}"`);
  });
});

describe('clear space (§5.5)', () => {
  const box = { x: 10, y: 20, width: 60, height: 40 };

  it('2. X = ratio × H and the zone is the box widened by X', () => {
    expect(clearSpace(box, 0.25)).toEqual({
      ok: true,
      value: { x: 10, zone: { x: 0, y: 10, width: 80, height: 60 } },
    });
    expect(clearSpace(box, 0.09)).toEqual({ ok: false, error: 'VALUE_OUT_OF_RANGE' });
    expect(clearSpace(box, 0.51)).toEqual({ ok: false, error: 'VALUE_OUT_OF_RANGE' });
  });

  it('draws the logo, a dashed zone and four X squares, accepted by the sanitizer', () => {
    const diagram = clearSpaceDiagramSvg(logo(box), box, 0.25);
    if (!diagram.ok) throw new Error(diagram.error);
    expect(diagram.value.match(/stroke-dasharray/g)).toHaveLength(1);
    expect(diagram.value.match(/<rect [^>]*height="10"[^>]*width="10"/g)).toHaveLength(4);
    expect(accepted(diagram.value)).toBe(true);
  });
});

describe("Do & Don't (§5.6, R8)", () => {
  const box = { x: 20, y: 20, width: 60, height: 60 };
  const twoColoursResult = sanitizeSvg(
    encode(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="30" fill="#1F4BFF"/><rect x="20" y="50" width="60" height="30" fill="#DAA500"/></svg>',
    ),
  );
  if (!twoColoursResult.ok) throw new Error(twoColoursResult.error.code);
  const twoColours = twoColoursResult.value.svg;

  it('3. the bad background has a contrast below 3 with the logo colour', () => {
    const panels = dosAndDontsSvg(logo(box), box, palette);
    if (!panels.ok) throw new Error(panels.error);
    const bad = panels.value.find((panel) => panel.kind === 'bad-background');
    expect(bad && contrastRatio(bad.background, palette.primary)).toBeLessThan(3);
    // Every other tile shares the light neutral background.
    for (const panel of panels.value.filter((candidate) => candidate !== bad))
      expect(panel.background).toBe(palette.neutralLight);
  });

  it('3 bis. generates a grey when no palette colour is close enough', () => {
    const contrasted = {
      primary: '#000000',
      accent: '#FFFFFF',
      neutralLight: '#FFFFFF',
      neutralDark: '#000000',
      extra: [],
    };
    const panels = dosAndDontsSvg(logo(box, '#000000'), box, contrasted);
    if (!panels.ok) throw new Error(panels.error);
    const bad = panels.value.find((panel) => panel.kind === 'bad-background');
    expect(bad?.background).not.toBe('#000000');
    expect(contrastRatio(bad?.background ?? '#FFFFFF', '#000000')).toBeLessThan(3);
  });

  it('4. a grid of 6 to 12 struck panels in R8 priority order, each a sanitizeSvg output', () => {
    const panels = dosAndDontsSvg(twoColours, box, palette);
    if (!panels.ok) throw new Error(panels.error);
    expect(panels.value.map((panel) => panel.kind)).toEqual([...DONT_KINDS]);
    for (const panel of panels.value) {
      expect(accepted(panel.svg)).toBe(true);
      expect(panel.labelKey).toBe(`logo.dont.${panel.kind}`);
      // R8: the red diagonal strike across the thumbnail, over a light halo for dark backgrounds.
      expect(panel.svg).toContain(`stroke="${STRIKE_RED}"`);
    }
  });

  it('4 bis. a one-shape, one-colour logo has no partial recolour panel, still at least 6', () => {
    const panels = dosAndDontsSvg(logo(box), box, palette);
    if (!panels.ok) throw new Error(panels.error);
    const kinds = panels.value.map((panel) => panel.kind);
    expect(kinds).not.toContain('partial-recolor');
    expect(kinds.length).toBeGreaterThanOrEqual(6);
    expect(kinds.length).toBeLessThanOrEqual(12);
  });

  it('4 ter. the panels really transform the logo', async () => {
    const panels = dosAndDontsSvg(twoColours, box, palette);
    if (!panels.ok) throw new Error(panels.error);
    const panel = (kind: string): string => {
      const found = panels.value.find((candidate) => candidate.kind === kind);
      if (!found) throw new Error(kind);
      return found.svg.replace(/<line[^>]*\/>/g, '');
    };
    // Pixels that differ from the tile colour (#F2F5FC): what the eye sees as drawn.
    const coverage = async (svg: string): Promise<{ ink: number; alpha: number }> => {
      const raster = await rasterizer.rasterize(svg, 128);
      if (!raster.ok) throw new Error(raster.error.code);
      const data = raster.value.rgba;
      let ink = 0;
      let alpha = 255;
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
        const distance = Math.max(Math.abs(r - 0xf2), Math.abs(g - 0xf5), Math.abs(b - 0xfc));
        if (distance > 24) ink += 1;
        // Transparency: the darkest channel of the logo stays close to the tile.
        if (distance > 0) alpha = Math.min(alpha, Math.min(r, g, b));
      }
      return { ink, alpha };
    };
    const original = await coverage(panel('rotate'));
    expect((await coverage(panel('outline'))).ink).toBeLessThan(original.ink * 0.6);
    expect((await coverage(panel('transparency'))).alpha).toBeGreaterThan(100);
    expect(original.alpha).toBeLessThan(100);
    const cropped = await rasterizer.bbox(panel('crop'));
    if (!cropped.ok) throw new Error(cropped.error.reason);
    const size = Number(/viewBox="0 0 ([\d.]+)/.exec(panel('crop'))?.[1]);
    expect(cropped.value.x + cropped.value.width).toBeGreaterThanOrEqual(size - 0.5);
    // Partial recolour: the first colour is kept, the second is replaced by the off-palette colour.
    const partial = panel('partial-recolor');
    expect(partial).toContain('#1F4BFF');
    expect(partial).not.toContain('#DAA500');
    expect(panel('shadow')).toContain('feDropShadow');
    expect(panel('busy-background')).toContain('<pattern');
  });

  it('5. the recolour hue is ≥ 60° from the primary and its derived accent, deterministic', () => {
    const hue = offPaletteHue(palette);
    const primary = hexToOklch(palette.primary).h ?? 0;
    const accent = hexToOklch(palette.accent).h ?? 0;
    expect(hueGap(hue, primary)).toBeGreaterThanOrEqual(60);
    expect(hueGap(hue, accent)).toBeGreaterThanOrEqual(60);
    expect(JSON.stringify(dosAndDontsSvg(logo(box), box, palette))).toBe(
      JSON.stringify(dosAndDontsSvg(logo(box), box, palette)),
    );
  });

  it('5 bis. with every hue within 60°, the hue maximising the minimal gap wins', () => {
    const crowded = {
      primary: '#FF0000',
      accent: '#FFFF00',
      neutralLight: '#F2F5FC',
      neutralDark: '#12161F',
      extra: ['#00FF00', '#00FFFF', '#0000FF', '#FF00FF'],
    };
    const hues = [crowded.primary, crowded.accent, ...crowded.extra].map(
      (hex) => hexToOklch(hex).h ?? 0,
    );
    const chosen = offPaletteHue(crowded);
    const minimalGap = (candidate: number): number =>
      Math.min(...hues.map((h) => hueGap(candidate, h)));
    const best = Math.max(
      ...Array.from({ length: 12 }, (_, k) => minimalGap(((hues[0] ?? 0) + 90 + 30 * k) % 360)),
    );
    expect(minimalGap(chosen)).toBeCloseTo(best, 9);
  });
});
