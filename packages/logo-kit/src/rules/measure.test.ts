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
});
