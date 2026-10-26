import { err, ok, type Result } from '@app/kernel';

// Homography of the unit square onto a scene quad (06_MOCKUP_ENGINE §4.1). The formulas are
// the spec's; this file translates them, it does not invent them.

export type Point = readonly [number, number];
/** Corners in scene pixels, in the order top-left, top-right, bottom-right, bottom-left. */
export type Quad = readonly [Point, Point, Point, Point];
/** Row-major 3×3 matrix [h11 h12 h13 h21 h22 h23 h31 h32 h33]. */
export type Homography = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type QuadError = {
  readonly code: 'INVALID_QUAD';
  readonly reason: 'not-finite' | 'not-convex' | 'mirrored' | 'singular';
};
export type ProjectionError = { readonly code: 'POINT_AT_INFINITY' };

const UNIT_SQUARE: Quad = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const EPSILON = 1e-12;

/** Checks the quad is a strictly convex quadrilateral, clockwise on screen (y down). */
export function checkQuad(quad: Quad): QuadError | null {
  if (!quad.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) {
    return { code: 'INVALID_QUAD', reason: 'not-finite' };
  }
  const crosses = quad.map((corner, index) => {
    const next = quad[(index + 1) % 4] ?? corner;
    const after = quad[(index + 2) % 4] ?? corner;
    return (
      (next[0] - corner[0]) * (after[1] - next[1]) - (next[1] - corner[1]) * (after[0] - next[0])
    );
  });
  const scale = Math.max(...quad.flat().map(Math.abs), 1);
  const threshold = EPSILON * scale * scale;
  // With 4 corners, turning the same way at every corner already means a simple convex quad
  // (exterior angles below π each cannot add up to two full turns).
  if (crosses.every((cross) => cross > threshold)) return null;
  if (crosses.every((cross) => cross < -threshold))
    return { code: 'INVALID_QUAD', reason: 'mirrored' };
  return { code: 'INVALID_QUAD', reason: 'not-convex' };
}

/** Solves the 8×8 system of §4.1 by Gaussian elimination with partial pivoting. */
export function computeHomography(quad: Quad): Result<Homography, QuadError> {
  const invalid = checkQuad(quad);
  if (invalid !== null) return err(invalid);

  const rows: number[][] = [];
  UNIT_SQUARE.forEach(([x, y], index) => {
    const [X, Y] = quad[index] ?? [NaN, NaN];
    rows.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X]);
    rows.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]);
  });

  const solution = solve(rows);
  if (solution === null) return err({ code: 'INVALID_QUAD', reason: 'singular' });
  const [h11, h12, h13, h21, h22, h23, h31, h32] = solution;
  return ok([h11, h12, h13, h21, h22, h23, h31, h32, 1]);
}

type Eight = readonly [number, number, number, number, number, number, number, number];

function solve(augmented: number[][]): Eight | null {
  const size = augmented.length;
  const m = augmented.map((row) => [...row]);
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(at(m, row, col)) > Math.abs(at(m, pivot, col))) pivot = row;
    }
    if (Math.abs(at(m, pivot, col)) < EPSILON) return null;
    const pivotRow = m[pivot] ?? [];
    m[pivot] = m[col] ?? [];
    m[col] = pivotRow;
    for (let row = col + 1; row < size; row += 1) {
      const factor = at(m, row, col) / at(m, col, col);
      const target = m[row] ?? [];
      for (let k = col; k <= size; k += 1) target[k] = at(m, row, k) - factor * at(m, col, k);
    }
  }
  const x = new Array<number>(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let sum = at(m, row, size);
    for (let k = row + 1; k < size; k += 1) sum -= at(m, row, k) * (x[k] ?? 0);
    x[row] = sum / at(m, row, row);
  }
  const [a = NaN, b = NaN, c = NaN, d = NaN, e = NaN, f = NaN, g = NaN, h = NaN] = x;
  const result: Eight = [a, b, c, d, e, f, g, h];
  return result.every(Number.isFinite) ? result : null;
}

const at = (m: readonly (readonly number[])[], row: number, col: number): number =>
  m[row]?.[col] ?? NaN;

/** `w = h31·x + h32·y + h33`, then division by `w` (§4.1). */
export function applyHomography(h: Homography, [x, y]: Point): Result<Point, ProjectionError> {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < EPSILON) return err({ code: 'POINT_AT_INFINITY' });
  return ok([(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]);
}

/** H⁻¹ by adjugate, for the inverse projection of §4.2 (scene pixel → logo uv). */
export function invertHomography(h: Homography): Result<Homography, QuadError> {
  const [a, b, c, d, e, f, g, i, j] = h;
  const adjugate: Homography = [
    e * j - f * i,
    c * i - b * j,
    b * f - c * e,
    f * g - d * j,
    a * j - c * g,
    c * d - a * f,
    d * i - e * g,
    b * g - a * i,
    a * e - b * d,
  ];
  const det = a * adjugate[0] + b * adjugate[3] + c * adjugate[6];
  if (!Number.isFinite(det) || Math.abs(det) < EPSILON)
    return err({ code: 'INVALID_QUAD', reason: 'singular' });
  const scale = Math.abs(adjugate[8]) > EPSILON ? adjugate[8] : det;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = adjugate.map((value) => value / scale);
  return ok([
    m0 ?? NaN,
    m1 ?? NaN,
    m2 ?? NaN,
    m3 ?? NaN,
    m4 ?? NaN,
    m5 ?? NaN,
    m6 ?? NaN,
    m7 ?? NaN,
    m8 ?? NaN,
  ]);
}
