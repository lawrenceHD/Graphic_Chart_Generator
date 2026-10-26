import { describe, expect, it } from 'vitest';
import vectors from '../../../docs/golden/color.golden.json' with { type: 'json' };
import {
  applyHomography,
  computeHomography,
  invertHomography,
  type Homography,
  type Point,
  type Quad,
} from './homography.js';

const TOLERANCE = 0.001;

const toPoint = (values: readonly number[]): Point => [values[0] ?? NaN, values[1] ?? NaN];
const toQuad = (values: readonly (readonly number[])[]): Quad => [
  toPoint(values[0] ?? []),
  toPoint(values[1] ?? []),
  toPoint(values[2] ?? []),
  toPoint(values[3] ?? []),
];

const expectPoint = (actual: Point, expected: Point, tolerance = TOLERANCE): void => {
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(tolerance);
};

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(`unexpected error: ${JSON.stringify(result.error)}`);
  return result.value;
};

const project = (h: Homography, p: Point): Point => unwrap(applyHomography(h, p));

const golden = vectors.homography;
const goldenQuad = toQuad(golden.dstQuad);

// Deterministic generator (no Math.random in tests: reproducible failures).
const lcg = (seed: number) => {
  let state = seed >>> 0;
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
};

describe('computeHomography — golden vector (06_MOCKUP_ENGINE §4.1)', () => {
  it('matches the 8 reference coefficients with h33 = 1', () => {
    const h = unwrap(computeHomography(goldenQuad));
    golden.H_row_major.forEach((expected, index) => {
      expect(Math.abs((h[index] ?? NaN) - expected)).toBeLessThanOrEqual(1e-6);
    });
  });

  it('sends the unit square and the control points onto the quad', () => {
    const h = unwrap(computeHomography(goldenQuad));
    for (const check of golden.checks) {
      expectPoint(project(h, toPoint(check.uv)), toPoint(check.xy));
    }
  });

  it('inverts back from scene pixels to logo uv', () => {
    const h = unwrap(computeHomography(goldenQuad));
    const inverse = unwrap(invertHomography(h));
    for (const check of golden.H_inverse_checks) {
      expectPoint(project(inverse, toPoint(check.xy)), toPoint(check.uv), 1e-5);
    }
  });
});

describe('computeHomography — generated quads (AC-M1)', () => {
  it('projects the 4 corners onto the quad within 0.5 px, and back', () => {
    const next = lcg(26);
    for (let run = 0; run < 500; run += 1) {
      // Random convex quad around a centre, corners in TL, TR, BR, BL order (y down).
      const cx = 400 + next() * 3000;
      const cy = 300 + next() * 1500;
      const jitter = (): number => (next() - 0.5) * 120;
      const w = 200 + next() * 600;
      const hgt = 150 + next() * 400;
      const quad: Quad = [
        [cx - w + jitter(), cy - hgt + jitter()],
        [cx + w + jitter(), cy - hgt + jitter()],
        [cx + w + jitter(), cy + hgt + jitter()],
        [cx - w + jitter(), cy + hgt + jitter()],
      ];
      const h = unwrap(computeHomography(quad));
      const inverse = unwrap(invertHomography(h));
      const corners: readonly Point[] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
      corners.forEach((uv, index) => {
        const corner = quad[index] ?? [NaN, NaN];
        expectPoint(project(h, uv), corner, 0.5);
        expectPoint(project(inverse, corner), uv, 1e-6);
      });
      const inside: Point = [next(), next()];
      expectPoint(project(inverse, project(h, inside)), inside, 1e-6);
    }
  });

  it('is the identity scaling for an axis-aligned rectangle', () => {
    const h = unwrap(
      computeHomography([
        [10, 20],
        [110, 20],
        [110, 70],
        [10, 70],
      ]),
    );
    expectPoint(project(h, [0.5, 0.5]), [60, 45]);
    expect(Math.abs(h[6])).toBeLessThan(1e-12);
    expect(Math.abs(h[7])).toBeLessThan(1e-12);
  });
});

describe('computeHomography — refusals', () => {
  const square: Quad = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ];

  it('refuses non-finite corners', () => {
    const result = computeHomography([[NaN, 0], square[1], square[2], square[3]]);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_QUAD', reason: 'not-finite' } });
  });

  it('refuses collinear or repeated corners', () => {
    const result = computeHomography([
      [0, 0],
      [50, 0],
      [100, 0],
      [0, 100],
    ]);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_QUAD', reason: 'not-convex' } });
  });

  it('refuses a self-intersecting (bow-tie) quad', () => {
    const result = computeHomography([square[0], square[1], square[3], square[2]]);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_QUAD', reason: 'not-convex' } });
  });

  it('refuses a concave quad', () => {
    const result = computeHomography([
      [0, 0],
      [100, 0],
      [30, 30],
      [0, 100],
    ]);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_QUAD', reason: 'not-convex' } });
  });

  it('refuses a mirrored quad (counter-clockwise on screen) that would flip the logo', () => {
    const result = computeHomography([square[0], square[3], square[2], square[1]]);
    expect(result).toEqual({ ok: false, error: { code: 'INVALID_QUAD', reason: 'mirrored' } });
  });
});

describe('applyHomography', () => {
  it('reports points sent to infinity instead of returning NaN', () => {
    // Projective map whose vanishing line is x = 1: w = 1 − x.
    const h: Homography = [1, 0, 0, 0, 1, 0, -1, 0, 1];
    expect(applyHomography(h, [1, 0.5])).toEqual({
      ok: false,
      error: { code: 'POINT_AT_INFINITY' },
    });
  });
});
