import { bezierMeshPoint, type BezierGrid } from './mesh.js';
import { logoAngle, revolutionPoint, type RevolutionFrame } from './revolution.js';

// From a computed surface to a UV map per pixel (ADR-034, research note §5.6). The surface is cut into
// triangles carrying (u, v, facing); the GPU draws them (render/uv-pass.ts) and this CPU rasteriser does
// the same for tests, measures and offline bakes. The encoding is the baked uv-*.png one: u or v on 16
// bits, high byte in red, low byte in green, coverage in blue.

export type CurvedMapping =
  | { readonly kind: 'revolution'; readonly frame: RevolutionFrame }
  | { readonly kind: 'mesh'; readonly grid: BezierGrid };

export interface UvMesh {
  /** x, y in scene pixels, per vertex. */
  readonly positions: Float32Array;
  /** u, v of the logo box and facing, per vertex. */
  readonly attributes: Float32Array;
  readonly indices: Uint32Array;
  /** Facing below which the coverage fades to the silhouette. */
  readonly edge: number;
}

export interface UvMap {
  readonly width: number;
  readonly height: number;
  readonly u: Float32Array;
  readonly v: Float32Array;
  readonly coverage: Float32Array;
  readonly facing: Float32Array;
}

export const UV_COLUMNS = 64;
export const UV_ROWS = 16;

/** Range of u that can face the viewer (the rest is behind the object), or null when none does. */
function visibleColumns(frame: RevolutionFrame): readonly [number, number] | null {
  const limit = Math.acos(Math.min(frame.top.kappa, frame.bottom.kappa));
  const toU = (theta: number) => (theta - frame.centreAngle) / frame.arc + 0.5;
  const from = Math.max(0, toU(-limit));
  const to = Math.min(1, toU(limit));
  return to > from ? [from, to] : null;
}

/** Triangles of the surface: `columns` x `rows` cells, hidden and folded triangles left out. */
export function tessellate(
  mapping: CurvedMapping,
  columns: number = UV_COLUMNS,
  rows: number = UV_ROWS,
): UvMesh {
  const range = mapping.kind === 'revolution' ? visibleColumns(mapping.frame) : [0, 1];
  const edge = mapping.kind === 'revolution' ? mapping.frame.edge : 0;
  if (range === null) {
    return {
      positions: new Float32Array(0),
      attributes: new Float32Array(0),
      indices: new Uint32Array(0),
      edge,
    };
  }
  const [u0, u1] = range;
  const count = (columns + 1) * (rows + 1);
  const positions = new Float32Array(count * 2);
  const attributes = new Float32Array(count * 3);
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= columns; i += 1) {
      const u = u0 + ((u1 - u0) * i) / columns;
      const v = j / rows;
      const vertex = j * (columns + 1) + i;
      let x: number;
      let y: number;
      let facing = 1;
      if (mapping.kind === 'revolution') {
        const [theta, s] = logoAngle(mapping.frame, u, v);
        const point = revolutionPoint(mapping.frame, theta, s);
        x = point.x;
        y = point.y;
        facing = point.facing;
      } else {
        [x, y] = bezierMeshPoint(mapping.grid, u, v);
      }
      positions.set([x, y], vertex * 2);
      attributes.set([u, v, facing], vertex * 3);
    }
  }
  const area = (a: number, b: number, c: number) => {
    const ax = positions[a * 2] ?? 0;
    const ay = positions[a * 2 + 1] ?? 0;
    return (
      ((positions[b * 2] ?? 0) - ax) * ((positions[c * 2 + 1] ?? 0) - ay) -
      ((positions[b * 2 + 1] ?? 0) - ay) * ((positions[c * 2] ?? 0) - ax)
    );
  };
  const candidates: (readonly [number, number, number])[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const a = j * (columns + 1) + i;
      const c = a + columns + 1;
      candidates.push([a, a + 1, c + 1], [a, c + 1, c]);
    }
  }
  // The surface keeps one orientation; a triangle of the other sign is a fold of the grid.
  const orientation = Math.sign(candidates.reduce((sum, [a, b, c]) => sum + area(a, b, c), 0));
  const kept: number[] = [];
  for (const [a, b, c] of candidates) {
    const facing = Math.max(
      attributes[a * 3 + 2] ?? 0,
      attributes[b * 3 + 2] ?? 0,
      attributes[c * 3 + 2] ?? 0,
    );
    if (facing > 0 && Math.sign(area(a, b, c)) === orientation) kept.push(a, b, c);
  }
  return { positions, attributes, indices: Uint32Array.from(kept), edge };
}

/** Coverage at a facing: full in front, fading over `edge` before the silhouette. */
export function coverageOf(facing: number, edge: number): number {
  if (facing <= 0) return 0;
  if (edge <= 0 || facing >= edge) return 1;
  const t = facing / edge;
  return t * t * (3 - 2 * t);
}

/** Draws the triangles at pixel centres; a pixel is written only where the surface faces the viewer. */
export function rasterizeUv(mesh: UvMesh, width: number, height: number): UvMap {
  const size = width * height;
  const map: UvMap = {
    width,
    height,
    u: new Float32Array(size),
    v: new Float32Array(size),
    coverage: new Float32Array(size),
    facing: new Float32Array(size),
  };
  const { positions: p, attributes: q, indices } = mesh;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0];
    const ax = p[a * 2] ?? 0;
    const ay = p[a * 2 + 1] ?? 0;
    const bx = p[b * 2] ?? 0;
    const by = p[b * 2 + 1] ?? 0;
    const cx = p[c * 2] ?? 0;
    const cy = p[c * 2 + 1] ?? 0;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        const wa = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const wb = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        const wc = 1 - wa - wb;
        if (wa < -1e-7 || wb < -1e-7 || wc < -1e-7) continue;
        const attribute = (k: number) =>
          wa * (q[a * 3 + k] ?? 0) + wb * (q[b * 3 + k] ?? 0) + wc * (q[c * 3 + k] ?? 0);
        const facing = attribute(2);
        if (facing <= 0) continue;
        const index = y * width + x;
        map.u[index] = attribute(0);
        map.v[index] = attribute(1);
        map.facing[index] = facing;
        map.coverage[index] = coverageOf(facing, mesh.edge);
      }
    }
  }
  return map;
}

/** RGBA bytes of the u and v maps, identical to the baked uv-*.png and vv-*.png. */
export function encodeUvMap(map: UvMap): {
  readonly u: Uint8ClampedArray;
  readonly v: Uint8ClampedArray;
} {
  const size = map.width * map.height;
  const u = new Uint8ClampedArray(size * 4);
  const v = new Uint8ClampedArray(size * 4);
  const write = (target: Uint8ClampedArray, index: number, value: number, alpha: number) => {
    const q = Math.round(Math.min(Math.max(value, 0), 1) * 65535);
    target[index * 4] = q >> 8;
    target[index * 4 + 1] = q & 255;
    target[index * 4 + 2] = Math.round((map.coverage[index] ?? 0) * 255);
    target[index * 4 + 3] = alpha;
  };
  for (let index = 0; index < size; index += 1) {
    write(u, index, map.u[index] ?? 0, 255);
    // The alpha of the v map carries the facing, for the curved lighting.
    write(v, index, map.v[index] ?? 0, Math.round(Math.max(map.facing[index] ?? 0, 0) * 255));
  }
  return { u, v };
}
