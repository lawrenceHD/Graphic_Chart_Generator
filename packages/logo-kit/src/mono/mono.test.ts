import type { Rasterizer } from '@app/contracts';
import { err } from '@app/kernel';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { fidelityScore, inkMask, iou, monochromeSvg } from './index.js';

const rasterizer = createNodeRasterizer();
const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
function sanitized(body: string): string {
  const result = sanitizeSvg(new TextEncoder().encode(`${OPEN}${body}</svg>`));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
function mono(svg: string, target: '#000000' | '#FFFFFF' = '#000000') {
  const result = monochromeSvg(svg, target);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}
async function score(original: string, variant: string): Promise<number> {
  const result = await fidelityScore(original, variant, rasterizer);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}
const fills = (svg: string): string[] =>
  [...svg.matchAll(/fill="([^"]+)"/g)].map((match) => match[1] ?? '');

describe('monochromeSvg — structural path (05_ENGINES.md §5.1–§5.2)', () => {
  it('1. one-colour logo → black variant, every shape black, IoU ≥ 0.99', async () => {
    const original = sanitized('<path d="M10 10 L90 10 L50 90 Z" fill="#1F4BFF"/>');
    const variant = mono(original);

    expect(variant.path).toBe('structural');
    expect(fills(variant.svg)).toEqual(['#000000']);
    expect(await score(original, variant.svg)).toBeGreaterThanOrEqual(0.99);
  });

  it('2. two-colour logo (red + blue) → two black shapes, IoU ≥ 0.99', async () => {
    const original = sanitized(
      '<g fill="#FF0000"><rect x="5" y="5" width="40" height="40"/></g><circle cx="70" cy="70" r="25" fill="#0000FF"/>',
    );
    const variant = mono(original);

    expect(fills(variant.svg)).toEqual(['#000000', '#000000']);
    expect(await score(original, variant.svg)).toBeGreaterThanOrEqual(0.99);
  });

  it('3. a light disk on a coloured shape becomes a hole (IoU ≥ 0.97 on the ink mask)', async () => {
    const original = sanitized(
      '<rect x="10" y="10" width="80" height="80" fill="#B3261E"/><circle cx="50" cy="50" r="20" fill="#FFFFFF"/>',
    );
    const variant = mono(original);
    const raster = await rasterizer.rasterize(variant.svg, 100);
    if (!raster.ok) throw new Error(raster.error.reason);
    const centre = (50 * 100 + 50) * 4;

    expect(raster.value.rgba[centre + 3]).toBe(0);
    expect(variant.warnings).toContain('LIGHT_SURFACES_KNOCKED_OUT');
    expect(await score(original, variant.svg)).toBeGreaterThanOrEqual(0.97);
  });

  it('4. a white-only logo is kept, not emptied, in the white variant', async () => {
    const original = sanitized('<circle cx="50" cy="50" r="40" fill="#FFFFFF"/>');
    const variant = mono(original, '#FFFFFF');

    expect(fills(variant.svg)).toEqual(['#FFFFFF']);
    expect(await score(original, variant.svg)).toBeGreaterThanOrEqual(0.99);
  });

  it('5. gradients become the target colour and no url(#…) remains', () => {
    const original = sanitized(
      '<defs><linearGradient id="g"><stop offset="0" stop-color="#1F4BFF"/><stop offset="1" stop-color="#00C4D9"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)" stroke="url(#g)"/>',
    );
    const variant = mono(original);

    expect(variant.svg).not.toContain('url(#');
    expect(variant.svg).not.toContain('Gradient');
    expect(variant.svg).toContain('fill="#000000"');
    expect(variant.svg).toContain('stroke="#000000"');
  });

  it('6. an SVG with a mask needs the raster fallback', () => {
    const original = sanitized(
      '<defs><mask id="m"><rect width="100" height="100" fill="#fff"/></mask></defs><rect width="100" height="100" mask="url(#m)"/>',
    );
    expect(mono(original).path).toBe('raster-fallback-needed');
  });

  it('keeps fill-opacity and opacity, and strokes in the target colour', () => {
    const variant = mono(
      sanitized('<path d="M0 0 L100 100" stroke="#123456" fill="none" opacity="0.5"/>'),
    );
    expect(variant.svg).toContain('stroke="#000000"');
    expect(variant.svg).toContain('fill="none"');
    expect(variant.svg).toContain('opacity="0.5"');
  });
});

describe('ink masks and IoU (§5.3)', () => {
  it('7. identical → 1, disjoint → 0, half overlap → 1/3', () => {
    const a = new Uint8Array([1, 1, 0, 0]);
    expect(iou(a, a)).toBe(1);
    expect(iou(a, new Uint8Array([0, 0, 1, 1]))).toBe(0);
    expect(iou(a, new Uint8Array([0, 1, 1, 0]))).toBeCloseTo(1 / 3, 12);
  });

  it('marks opaque dark pixels as ink, transparent and light ones as not', () => {
    const rgba = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 200, 0, 0, 255]);
    expect([...inkMask({ width: 4, height: 1, rgba })]).toEqual([1, 0, 0, 1]);
  });

  it('8. fidelityScore returns the rasterizer error instead of throwing', async () => {
    const failing: Rasterizer = {
      rasterize: () => Promise.resolve(err({ code: 'RASTER_FAILED', reason: 'boom' })),
      bbox: () => Promise.resolve(err({ code: 'RASTER_FAILED', reason: 'boom' })),
    };
    expect(await fidelityScore('<svg/>', '<svg/>', failing)).toEqual({
      ok: false,
      error: { code: 'RASTER_FAILED', reason: 'boom' },
    });
  });
});
