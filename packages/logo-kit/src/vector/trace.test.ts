import type { BinaryMask, TracedPath, Vectorizer } from '@app/contracts';
import { ok } from '@app/kernel';
import { createNodeRasterizer } from '@app/svg-engine/raster';
import { describe, expect, it } from 'vitest';
import { coverageLayers, smoothMask, vectorizeRaster } from './trace.js';

const rasterizer = createNodeRasterizer();

/** RGBA raster from [r, g, b, a] pixels on one row. */
function row(...pixels: readonly (readonly [number, number, number, number])[]) {
  return { width: pixels.length, height: 1, rgba: new Uint8Array(pixels.flat()) };
}
const near = (values: Float32Array): number[] => [...values].map((v) => Math.round(v * 100) / 100);

describe('coverageLayers — how much of each logo colour a pixel holds', () => {
  it('unmixes anti-aliased edges against an opaque background', () => {
    const raster = row(
      [255, 255, 255, 255],
      [255, 0, 0, 255],
      [255, 128, 128, 255], // half red on white
      [0, 0, 255, 255],
    );
    const [red, blue] = coverageLayers(raster, ['#FF0000', '#0000FF'], '#FFFFFF');

    expect(near(red ?? new Float32Array())).toEqual([0, 1, 0.5, 0]);
    expect(near(blue ?? new Float32Array())).toEqual([0, 0, 0, 1]);
  });

  it('reads coverage from alpha on a transparent logo', () => {
    const raster = row([0, 0, 0, 0], [255, 0, 0, 128], [0, 0, 255, 255]);
    const [red, blue] = coverageLayers(raster, ['#FF0000', '#0000FF'], null);

    expect(near(red ?? new Float32Array())).toEqual([0, 0.5, 0]);
    expect(near(blue ?? new Float32Array())).toEqual([0, 0, 1]);
  });

  it('splits a pixel between two touching inks', () => {
    const raster = row([128, 0, 127, 255]);
    const [red, blue] = coverageLayers(raster, ['#FF0000', '#0000FF'], '#FFFFFF');

    expect(near(red ?? new Float32Array())).toEqual([0.5]);
    expect(near(blue ?? new Float32Array())).toEqual([0.5]);
  });
});

// A disc of radius 7 px rendered with anti-aliasing at 20 px: what a small logo PNG looks like.
function discCoverage(size: number, radius: number, scale: number): Float32Array {
  const out = new Float32Array(size * scale * size * scale);
  const centre = (size * scale) / 2;
  const sub = 4;
  for (let y = 0; y < size * scale; y += 1)
    for (let x = 0; x < size * scale; x += 1) {
      let hits = 0;
      for (let j = 0; j < sub; j += 1)
        for (let i = 0; i < sub; i += 1) {
          const px = x + (i + 0.5) / sub - centre;
          const py = y + (j + 0.5) / sub - centre;
          if (px * px + py * py < (radius * scale) ** 2) hits += 1;
        }
      out[y * size * scale + x] = hits / (sub * sub);
    }
  return out;
}

describe('smoothMask — enlarging a small logo without staircase edges', () => {
  it('rebuilds the true outline of an anti-aliased disc at 8×', () => {
    const scale = 8;
    const mask = smoothMask(discCoverage(20, 7, 1), 20, 20, scale);
    const truth = discCoverage(20, 7, scale);
    let wrong = 0;
    let area = 0;
    for (let index = 0; index < truth.length; index += 1) {
      const inside = (truth[index] ?? 0) >= 0.5;
      if (inside) area += 1;
      if (inside !== (mask.data[index] === 1)) wrong += 1;
    }

    expect(mask.width).toBe(160);
    expect(mask.height).toBe(160);
    // Nearest-neighbour enlargement misses about 9 % of the disc's area on its staircase edge.
    expect(wrong / area).toBeLessThan(0.02);
  });

  it('keeps a hairline thinner than a pixel, as wide as its ink', () => {
    // A vertical stroke 0.4 px wide: every pixel of column 10 is 40 % covered.
    const coverage = new Float32Array(20 * 20);
    for (let y = 2; y < 18; y += 1) coverage[y * 20 + 10] = 0.4;
    const scale = 8;
    const mask = smoothMask(coverage, 20, 20, scale);
    const widths: number[] = [];
    for (let y = 4 * scale; y < 16 * scale; y += 1) {
      let width = 0;
      for (let x = 0; x < mask.width; x += 1) width += mask.data[y * mask.width + x] ?? 0;
      widths.push(width);
    }

    // Unbroken, and about 0.4 × 8 = 3.2 px wide.
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...widths)).toBeLessThanOrEqual(5);
  });
});

/** Traces each mask as the rectangle bounding its ink: enough to check the assembly. */
function boxVectorizer(seen: BinaryMask[]): Vectorizer {
  return {
    trace: (mask) => {
      seen.push(mask);
      let [x0, y0, x1, y1] = [mask.width, mask.height, -1, -1];
      for (let y = 0; y < mask.height; y += 1)
        for (let x = 0; x < mask.width; x += 1)
          if (mask.data[y * mask.width + x] === 1) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x + 1);
            y1 = Math.max(y1, y + 1);
          }
      const path: TracedPath = { d: `M0 0 H${String(x1 - x0)} V${String(y1 - y0)} H0 Z`, dx: x0, dy: y0 };
      return Promise.resolve(ok(x1 < 0 ? [] : [path]));
    },
  };
}

function twoBlocks() {
  const width = 40;
  const height = 20;
  const rgba = new Uint8Array(width * height * 4).fill(255);
  for (let y = 4; y < 16; y += 1)
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (x >= 4 && x < 16) rgba.set([216, 143, 122, 255], offset);
      if (x >= 24 && x < 36) rgba.set([166, 180, 155, 255], offset);
    }
  return { width, height, rgba };
}

describe('vectorizeRaster — a vector logo from a raster upload', () => {
  it('traces one layer per logo colour, filled with it, in the logo’s proportions', async () => {
    const seen: BinaryMask[] = [];
    const result = await vectorizeRaster(
      twoBlocks(),
      { colors: ['#D88F7A', '#A6B49B', '#1D1D1B'], background: '#FFFFFF', width: 400 },
      boxVectorizer(seen),
      rasterizer,
    );
    if (!result.ok) throw new Error(result.error.reason);
    const { svg, fidelity, colors } = result.value;

    // The near-black has no ink in this logo: no empty layer is traced.
    expect(colors).toEqual(['#D88F7A', '#A6B49B']);
    expect(seen.map((mask) => mask.width)).toEqual([400, 400]);
    expect(svg).toContain('viewBox="0 0 400 200"');
    expect([...svg.matchAll(/fill="(#[0-9A-F]{6})"/g)].map((m) => m[1])).toEqual([
      '#D88F7A',
      '#A6B49B',
    ]);
    expect(fidelity).toBeGreaterThan(0.97);
  });

  it('scores a drawing that lost a colour as unfaithful', async () => {
    const dropSecond: Vectorizer = {
      trace: (mask) => {
        const box = boxVectorizer([]);
        const left = { ...mask, data: mask.data.map((v, i) => (i % mask.width < 200 ? v : 0)) };
        return box.trace(left);
      },
    };
    const result = await vectorizeRaster(
      twoBlocks(),
      { colors: ['#D88F7A', '#A6B49B'], background: '#FFFFFF', width: 400 },
      dropSecond,
      rasterizer,
    );
    if (!result.ok) throw new Error(result.error.reason);

    expect(result.value.fidelity).toBeLessThan(0.6);
  });
});
