import type { Vec2 } from './revolution.js';

// Bicubic Bezier grid (ADR-034), the format of Photoshop's custom warp (customEnvelopeWarp.meshPoints):
// (3k+1) x (3m+1) control points row by row, k x m patches. Same evaluation as bake.py's warp_points.

export interface BezierGrid {
  readonly cols: number;
  readonly rows: number;
  readonly points: readonly Vec2[];
}

const bernstein = (t: number): readonly [number, number, number, number] => {
  const s = 1 - t;
  return [s * s * s, 3 * t * s * s, 3 * t * t * s, t * t * t];
};

/** Patch index and local parameter of a global parameter in [0, 1] over `patches` patches. */
function locate(t: number, patches: number): readonly [number, number] {
  const scaled = Math.min(Math.max(t, 0), 1) * patches;
  const patch = Math.min(Math.floor(scaled), patches - 1);
  return [patch, scaled - patch];
}

/** The scene point of the grid at (u, v) in [0, 1]². */
export function bezierMeshPoint(grid: BezierGrid, u: number, v: number): Vec2 {
  const [pu, lu] = locate(u, (grid.cols - 1) / 3);
  const [pv, lv] = locate(v, (grid.rows - 1) / 3);
  const bu = bernstein(lu);
  const bv = bernstein(lv);
  let x = 0;
  let y = 0;
  for (let j = 0; j < 4; j += 1) {
    for (let i = 0; i < 4; i += 1) {
      const weight = (bv[j] ?? 0) * (bu[i] ?? 0);
      const point = grid.points[(pv * 3 + j) * grid.cols + pu * 3 + i];
      if (point === undefined) continue;
      x += weight * point[0];
      y += weight * point[1];
    }
  }
  return [x, y];
}
