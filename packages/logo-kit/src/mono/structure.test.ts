import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import {
  fidelityScore,
  monochromeSvg,
  monochromeVariant,
  structureScore,
  tonalSvg,
} from './index.js';

// A multi-colour logo whose pieces touch keeps its drawing only through the colour boundaries between them.
// Painted in one colour, those boundaries vanish and the logo becomes a silhouette: the IoU of §5.3 cannot
// see it (the silhouette is unchanged), the structure score can.
const rasterizer = createNodeRasterizer();
const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
function sanitized(body: string): string {
  const result = sanitizeSvg(new TextEncoder().encode(`${OPEN}${body}</svg>`));
  if (!result.ok) throw new Error(result.error.code);
  return result.value.svg;
}
async function structure(original: string, variant: string): Promise<number> {
  const result = await structureScore(original, variant, rasterizer);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}
async function fidelity(original: string, variant: string): Promise<number> {
  const result = await fidelityScore(original, variant, rasterizer);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}
function mono(svg: string, separation = 0) {
  const result = monochromeSvg(svg, '#000000', { separation });
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
}

// Three facets sharing edges, in three colours (a folded-paper mark).
const FACETS = sanitized(
  '<path d="M10 10 L50 10 L50 90 Z" fill="#E24329"/>' +
    '<path d="M50 10 L90 10 L50 90 Z" fill="#FC6D26"/>' +
    '<path d="M10 10 L50 90 L10 90 Z" fill="#FCA326"/>',
);
// Same geometry, one colour: there is no inner drawing to keep.
const PLAIN = sanitized(
  '<path d="M10 10 L50 10 L50 90 Z" fill="#E24329"/>' +
    '<path d="M50 10 L90 10 L50 90 Z" fill="#E24329"/>' +
    '<path d="M10 10 L50 90 L10 90 Z" fill="#E24329"/>',
);

describe('structure of monochrome variants', () => {
  it('measures the loss: a plain one-colour variant of touching facets keeps almost no inner boundary', async () => {
    expect(await structure(FACETS, mono(FACETS).svg)).toBeLessThan(0.2);
    expect(await structure(FACETS, FACETS)).toBe(1);
  });

  it('separation cuts a thin gap along each colour boundary: structure kept, silhouette almost unchanged', async () => {
    const separated = mono(FACETS, 0.012);
    expect(separated.path).toBe('structural');
    expect(await structure(FACETS, separated.svg)).toBeGreaterThanOrEqual(0.9);
    expect(await fidelity(FACETS, separated.svg)).toBeGreaterThanOrEqual(0.95);
  });

  it('a logo without colour boundaries has nothing to lose and gets no gap', async () => {
    expect(await structure(PLAIN, mono(PLAIN).svg)).toBe(1);
    expect(mono(PLAIN, 0.012).svg).toBe(mono(PLAIN).svg);
  });

  it('the tonal variant gives each colour its own shade of the target, keeping the drawing', async () => {
    const tonal = tonalSvg(FACETS, '#000000');
    if (!tonal.ok) throw new Error(tonal.error.reason);
    const fills = new Set([...tonal.value.svg.matchAll(/fill="(#[0-9A-F]{6})"/g)].map((m) => m[1]));
    expect(fills.size).toBe(3);
    expect(await structure(FACETS, tonal.value.svg)).toBeGreaterThanOrEqual(0.9);
    expect(await fidelity(FACETS, tonal.value.svg)).toBeGreaterThanOrEqual(0.97);
  });

  it('monochromeVariant switches to the separated drawing only when the plain one loses the structure', async () => {
    const facets = await monochromeVariant(FACETS, '#000000', rasterizer);
    const plain = await monochromeVariant(PLAIN, '#000000', rasterizer);
    if (!facets.ok || !plain.ok) throw new Error('variant failed');
    expect(facets.value.separated).toBe(true);
    expect(facets.value.structure).toBeGreaterThanOrEqual(0.9);
    expect(plain.value.separated).toBe(false);
    expect(plain.value.svg).toBe(mono(PLAIN).svg);
  });
});
