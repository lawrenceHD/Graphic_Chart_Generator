import { describe, expect, it } from 'vitest';
import { computeHomography, type Quad } from './homography.js';
import { logoRasterSize, placeLogo } from './placement.js';

const close = (actual: number, expected: number, tolerance = 1e-9): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe('placeLogo — contain with paddingRatio (06_MOCKUP_ENGINE §3)', () => {
  it('centres a wide logo, limited by the width of the printable box', () => {
    // Box 1.75 × 1, margin 0.18 × 1 on every side → inner 1.39 × 0.64.
    const rect = placeLogo({ aspect: 1.75, fit: 'contain', paddingRatio: 0.18 }, 4);
    // Logo 4:1 → width-limited: 1.39 wide, 0.3475 high.
    close(rect.u1 - rect.u0, 1.39 / 1.75);
    close(rect.v1 - rect.v0, 0.3475);
    close((rect.u0 + rect.u1) / 2, 0.5);
    close((rect.v0 + rect.v1) / 2, 0.5);
  });

  it('centres a tall logo, limited by the height of the printable box', () => {
    const rect = placeLogo({ aspect: 1.75, fit: 'contain', paddingRatio: 0.18 }, 0.5);
    // Inner height 0.64 → logo 0.32 × 0.64 in physical units.
    close(rect.v0, 0.18);
    close(rect.v1, 0.82);
    close(rect.u1 - rect.u0, 0.32 / 1.75);
  });

  it('keeps the same physical margin on every side of a portrait box', () => {
    const rect = placeLogo({ aspect: 0.5, fit: 'contain', paddingRatio: 0.1 }, 0.5);
    // Box 0.5 × 1, margin 0.05 → inner 0.4 × 0.9, logo 0.4 × 0.8.
    close(rect.u0, 0.1);
    close(rect.u1, 0.9);
    close(rect.v0, 0.1);
    close(rect.v1, 0.9);
  });

  it('preserves the logo aspect ratio in physical units', () => {
    for (const logoAspect of [0.2, 0.75, 1, 1.75, 3, 9]) {
      const box = { aspect: 1.4, fit: 'contain' as const, paddingRatio: 0.12 };
      const rect = placeLogo(box, logoAspect);
      close(((rect.u1 - rect.u0) * box.aspect) / (rect.v1 - rect.v0), logoAspect, 1e-9);
      expect(rect.u0).toBeGreaterThanOrEqual(0);
      expect(rect.v0).toBeGreaterThanOrEqual(0);
      expect(rect.u1).toBeLessThanOrEqual(1);
      expect(rect.v1).toBeLessThanOrEqual(1);
    }
  });
});

describe('logoRasterSize — rasterise at destination resolution (§4.2)', () => {
  const quad: Quad = [
    [1210, 640],
    [2480, 705],
    [2430, 1390],
    [1175, 1320],
  ];

  it('is at least 1.5 × the widest projected edge of the logo', () => {
    const h = computeHomography(quad);
    if (!h.ok) throw new Error('quad should be valid');
    const full = { u0: 0, v0: 0, u1: 1, v1: 1 };
    const size = logoRasterSize(h.value, full, 1.75);
    // Top edge (1210,640)→(2480,705) is the longest horizontal edge: ≈ 1271.66 px.
    expect(size.width).toBe(Math.ceil(1.5 * Math.hypot(1270, 65)));
    expect(size.height).toBe(Math.ceil(size.width / 1.75));
  });

  it('grows with the vertical edges when the logo is tall', () => {
    const h = computeHomography(quad);
    if (!h.ok) throw new Error('quad should be valid');
    const tall = placeLogo({ aspect: 1.75, fit: 'contain', paddingRatio: 0 }, 0.25);
    const size = logoRasterSize(h.value, tall, 0.25);
    // The left/right projected edges are ≈ 680–685 px high: height must cover 1.5 × that.
    expect(size.height).toBeGreaterThanOrEqual(Math.ceil(1.5 * 680));
    expect(Math.abs(size.width / size.height - 0.25)).toBeLessThan(0.01);
  });
});
