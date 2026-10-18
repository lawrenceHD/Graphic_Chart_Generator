import { contrastRatio, hexToOklch } from '@app/color-engine';
import type { Rect } from '@app/contracts';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { clearSpace, clearSpaceDiagramSvg } from './clear-space.js';
import { dosAndDontsSvg, offPaletteHue } from './dos-donts.js';
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

describe("Do & Don't (§5.6)", () => {
  const box = { x: 20, y: 20, width: 60, height: 60 };

  it('3. the bad background has a contrast below 3 with the logo colour', () => {
    const panels = dosAndDontsSvg(logo(box), box, palette);
    if (!panels.ok) throw new Error(panels.error);
    const bad = panels.value.find((panel) => panel.kind === 'bad-background');
    expect(bad && contrastRatio(bad.background ?? '', palette.primary)).toBeLessThan(3);
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

  it('4. every generated panel is a sanitizeSvg output with a label key', () => {
    const panels = dosAndDontsSvg(logo(box), box, palette);
    if (!panels.ok) throw new Error(panels.error);
    expect(panels.value.map((panel) => panel.kind)).toEqual([
      'distort',
      'rotate',
      'recolor',
      'bad-background',
    ]);
    for (const panel of panels.value) {
      expect(accepted(panel.svg)).toBe(true);
      expect(panel.labelKey).toMatch(/^logo\.dont\./);
    }
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
