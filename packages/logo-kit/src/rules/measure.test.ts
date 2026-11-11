import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { measureLogo } from './measure.js';

const rasterizer = createNodeRasterizer();
function svgOf(body: string, viewBox = '0 0 200 100'): string {
  const result = sanitizeSvg(
    new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`,
    ),
  );
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}

describe('measureLogo (R6, R7)', () => {
  // A symbol 80 high, then three "letters" 30 high: the unit x is the height of the first letter-sized
  // element in reading order, not a margin chosen for the logo.
  const lockup = svgOf(
    '<rect x="10" y="10" width="60" height="80" fill="#1F4BFF"/>' +
      '<rect x="90" y="40" width="20" height="30" fill="#12161F"/>' +
      '<rect x="120" y="40" width="20" height="30" fill="#12161F"/>' +
      '<rect x="150" y="40" width="40" height="30" fill="#12161F"/>',
  );

  it('takes x from the first element between 10 % and 50 % of the logo height', async () => {
    const measured = await measureLogo(lockup, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    const { clearSpace } = measured.value;
    expect(clearSpace.source).toBe('element');
    expect(clearSpace.x).toBeCloseTo(30, 0);
    expect(clearSpace.element?.x).toBeCloseTo(90, 0);
    expect(clearSpace.element?.width).toBeCloseTo(20, 0);
    expect(measured.value.bbox.height).toBeCloseTo(80, 0);
  });

  it('falls back to the 0.25 × H convention, said so, when no element fits', async () => {
    const mark = svgOf('<circle cx="100" cy="50" r="40" fill="#1F4BFF"/>');
    const measured = await measureLogo(mark, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.clearSpace.source).toBe('convention');
    expect(measured.value.clearSpace.x).toBeCloseTo(20, 0);
    expect(measured.value.clearSpace.element).toBeUndefined();
  });

  it('sizes the minimum so that the smallest element keeps 6 px and 1.5 mm', async () => {
    const measured = await measureLogo(lockup, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    const { minimum } = measured.value;
    // H = 80, smallest element 30: 6 × 80 / 30 = 16 px high, 1.5 × 80 / 30 = 4 mm high.
    expect(minimum.heightPx).toBe(24); // floor of 05_ENGINES.md §5.5
    expect(minimum.heightMm).toBe(5);
    expect(minimum.widthPx).toBe(Math.ceil((24 * 180) / 80));
    expect(minimum.widthMm).toBe(Math.ceil(((5 * 180) / 80) * 2) / 2);
  });

  it('sizes on the typical letter, not on a dot or a leaf', async () => {
    const dotted = svgOf(
      '<rect x="10" y="0" width="40" height="100" fill="#1F4BFF"/>' +
        [60, 85, 110, 135, 160]
          .map((x) => `<rect x="${String(x)}" y="60" width="20" height="30"/>`)
          .join('') +
        '<rect x="62" y="40" width="10" height="10"/>',
    );
    const measured = await measureLogo(dotted, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    // Letters 30 of 100 rule: 6 × 100 / 30 = 20 px → floor 24 px; the dot (10) would give 60 px.
    expect(measured.value.minimum.heightPx).toBe(24);
  });

  it('raises the minimum for a logo with small details', async () => {
    const fine = svgOf(
      '<rect x="10" y="0" width="60" height="100" fill="#1F4BFF"/>' +
        '<rect x="90" y="80" width="10" height="12" fill="#12161F"/>' +
        '<rect x="110" y="80" width="10" height="12" fill="#12161F"/>',
    );
    const measured = await measureLogo(fine, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    // Smallest element 12 of 100: 6 × 100 / 12 = 50 px, 1.5 × 100 / 12 = 12.5 mm.
    // Measured on a 1024 px render: one pixel of anti-aliasing either way.
    expect(measured.value.minimum.heightPx).toBeGreaterThanOrEqual(49);
    expect(measured.value.minimum.heightPx).toBeLessThanOrEqual(52);
    expect([12.5, 13]).toContain(measured.value.minimum.heightMm);
  });

  it('finds the symbol of a lockup: the side of the widest gap with few pieces, facing the letters', async () => {
    const measured = await measureLogo(lockup, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    const symbol = measured.value.symbol;
    expect(symbol?.x).toBeCloseTo(10, 0);
    expect(symbol?.width).toBeCloseTo(60, 0);
    expect(symbol?.height).toBeCloseTo(80, 0);
  });

  it('gives the symbol its own minimum: 16 px (favicon) and 3 mm when it is one solid shape', async () => {
    const measured = await measureLogo(lockup, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    const minimum = measured.value.symbolMinimum;
    expect(minimum).toMatchObject({ heightPx: 16, heightMm: 3, widthMm: 2.5 });
    expect([12, 13]).toContain(minimum?.widthPx);
  });

  it('raises the symbol minimum when the symbol is made of small parts', async () => {
    // A symbol 80 high made of two bars 10 high: each bar keeps 6 px, so the symbol needs 48 px.
    const bars = svgOf(
      [10, 80]
        .map((y) => `<rect x="10" y="${String(y)}" width="60" height="10" fill="#1F4BFF"/>`)
        .join('') +
        [90, 115, 140, 165]
          .map((x) => `<rect x="${String(x)}" y="40" width="20" height="30" fill="#12161F"/>`)
          .join(''),
    );
    const measured = await measureLogo(bars, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.symbol?.height).toBeCloseTo(80, 0);
    expect(measured.value.symbolMinimum?.heightPx).toBeGreaterThanOrEqual(47);
    expect(measured.value.symbolMinimum?.heightPx).toBeLessThanOrEqual(49);
    expect([12, 12.5]).toContain(measured.value.symbolMinimum?.heightMm);
  });

  it('has no symbol minimum without a symbol', async () => {
    const mark = svgOf('<circle cx="100" cy="50" r="40" fill="#1F4BFF"/>');
    const measured = await measureLogo(mark, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.symbolMinimum).toBeUndefined();
  });

  it('finds a symbol stacked above its name', async () => {
    const stacked = svgOf(
      '<circle cx="100" cy="35" r="30" fill="#EB001B"/>' +
        [20, 50, 80, 110, 140]
          .map((x) => `<rect x="${String(x)}" y="78" width="20" height="15"/>`)
          .join(''),
    );
    const measured = await measureLogo(stacked, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.symbol?.y).toBeCloseTo(5, 0);
    expect(measured.value.symbol?.height).toBeCloseTo(60, 0);
  });

  it('has no separable symbol for a mark made of equal pieces or of one piece', async () => {
    const grid = svgOf(
      '<rect x="10" y="10" width="35" height="35"/><rect x="55" y="10" width="35" height="35"/>' +
        '<rect x="10" y="55" width="35" height="35"/><rect x="55" y="55" width="35" height="35"/>',
      '0 0 100 100',
    );
    const one = svgOf('<circle cx="100" cy="50" r="40"/>');
    for (const logo of [grid, one]) {
      const measured = await measureLogo(logo, rasterizer);
      if (!measured.ok) throw new Error(measured.error);
      expect(measured.value.symbol).toBeUndefined();
    }
  });

  it('finds the symbol even when a word space of the name is wider than the symbol gap', async () => {
    // Symbol 0–40, gap 10, "Studio" 50–110, word space 25, "Nord" 135–175.
    const word = (xs: number[]) =>
      xs.map((x) => `<rect x="${String(x)}" y="45" width="8" height="25"/>`).join('');
    const twoWords = svgOf(
      '<rect x="0" y="20" width="40" height="70" fill="#1F4BFF"/>' +
        word([50, 60, 70, 80, 90, 100]) +
        word([135, 145, 155, 165]),
    );
    const measured = await measureLogo(twoWords, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.symbol?.width).toBeCloseTo(40, 0);
  });

  it('never takes a letter for a symbol ("I Love Paris")', async () => {
    const word = (xs: number[]) =>
      xs.map((x) => `<rect x="${String(x)}" y="40" width="8" height="25"/>`).join('');
    const sentence = svgOf(word([0]) + word([25, 35, 45, 55]) + word([80, 90, 100, 110, 120]));
    const measured = await measureLogo(sentence, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.symbol).toBeUndefined();
  });

  it('maps pixels back to user units for a viewBox that does not start at 0 0', async () => {
    const shifted = svgOf(
      '<rect x="60" y="30" width="60" height="80" fill="#1F4BFF"/>' +
        '<rect x="140" y="60" width="20" height="30"/><rect x="170" y="60" width="20" height="30"/>' +
        '<rect x="200" y="60" width="40" height="30"/>',
      '50 20 200 100',
    );
    const measured = await measureLogo(shifted, rasterizer);
    if (!measured.ok) throw new Error(measured.error);
    expect(measured.value.bbox.x).toBeCloseTo(60, 0);
    expect(measured.value.bbox.y).toBeCloseTo(30, 0);
    expect(measured.value.clearSpace.element?.x).toBeCloseTo(140, 0);
    expect(measured.value.symbol?.x).toBeCloseTo(60, 0);
  });

  it('refuses an empty logo and an SVG without a usable viewBox', async () => {
    const empty = await measureLogo(
      svgOf('<rect x="0" y="0" width="10" height="10" fill="none"/>'),
      rasterizer,
    );
    expect(empty).toEqual({ ok: false, error: 'EMPTY_LOGO' });
    expect(await measureLogo('<svg/>', rasterizer)).toEqual({ ok: false, error: 'INVALID_SVG' });
  });
});
