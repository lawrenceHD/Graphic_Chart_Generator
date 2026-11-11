import { describe, expect, it } from 'vitest';
import { applyHomography, computeHomography, invertHomography } from '../homography.js';
import { decodeUv } from '../render/psd.js';
import { bezierMeshPoint, type BezierGrid } from './mesh.js';
import {
  logoAngle,
  revolutionFrame,
  revolutionPoint,
  type RevolutionGeometry,
} from './revolution.js';
import { encodeUvMap, rasterizeUv, tessellate, type UvMap } from './uv-map.js';

// ADR-034, research note §5.5–§5.6: geometry → triangles → a UV map per pixel, in the format of the
// baked uv-*.png maps.

const cylinder = (patch: Partial<RevolutionGeometry> = {}): RevolutionGeometry => ({
  kind: 'revolution',
  top: { left: [100, 100], right: [500, 100], front: [300, 140] },
  bottom: { left: [100, 500], right: [500, 500], front: [300, 540] },
  band: { from: 0.1, to: 0.9 },
  arcDegrees: 120,
  centreDegrees: 0,
  ...patch,
});

const frameOf = (geometry: RevolutionGeometry) => {
  const frame = revolutionFrame(geometry);
  if (!frame.ok) throw new Error(frame.error.reason);
  return frame.value;
};

const rasterOf = (geometry: RevolutionGeometry): UvMap =>
  rasterizeUv(tessellate({ kind: 'revolution', frame: frameOf(geometry) }), 600, 600);

const covered = (map: UvMap) => {
  const pixels: number[] = [];
  map.coverage.forEach((value, index) => {
    if (value > 0) pixels.push(index);
  });
  return pixels;
};

const regular = (cols: number, rows: number, width: number, height: number): BezierGrid => ({
  cols,
  rows,
  points: Array.from({ length: cols * rows }, (_, index): readonly [number, number] => [
    ((index % cols) / (cols - 1)) * width,
    (Math.floor(index / cols) / (rows - 1)) * height,
  ]),
});

describe('bezierMeshPoint', () => {
  it('is the bilinear identity on a regular grid, one patch or several', () => {
    for (const grid of [regular(4, 4, 300, 200), regular(7, 10, 300, 200)]) {
      for (const [u, v] of [
        [0, 0],
        [0.25, 0.8],
        [0.5, 0.5],
        [1, 1],
        [0.66, 0.34],
      ] as const) {
        const [x, y] = bezierMeshPoint(grid, u, v);
        expect(x).toBeCloseTo(u * 300, 9);
        expect(y).toBeCloseTo(v * 200, 9);
      }
    }
  });

  it('follows a moved control point inside its patch only', () => {
    const grid = regular(7, 4, 300, 200);
    const moved: BezierGrid = {
      ...grid,
      points: grid.points.map((p, index) => (index === 8 ? [p[0], p[1] + 60] : p)),
    };
    expect(bezierMeshPoint(moved, 0.2, 0.4)[1]).toBeGreaterThan(80 + 5);
    expect(bezierMeshPoint(moved, 0.8, 0.4)[1]).toBeCloseTo(80, 9);
  });
});

describe('tessellate', () => {
  it('keeps no triangle on the hidden side', () => {
    const mesh = tessellate({
      kind: 'revolution',
      frame: frameOf(cylinder({ centreDegrees: 60, arcDegrees: 180 })),
    });
    expect(mesh.indices.length).toBeGreaterThan(0);
    for (let index = 0; index < mesh.indices.length; index += 1) {
      const vertex = mesh.indices[index] ?? 0;
      expect(mesh.attributes[vertex * 3]).toBeLessThanOrEqual(2 / 3 + 1e-6);
    }
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const facings = [0, 1, 2].map(
        (k) => mesh.attributes[(mesh.indices[t + k] ?? 0) * 3 + 2] ?? 0,
      );
      expect(Math.max(...facings)).toBeGreaterThan(0);
    }
  });

  it('is empty when the whole logo box is behind the object', () => {
    const behind = cylinder({ centreDegrees: 90, arcDegrees: 1 });
    const frame = frameOf(behind);
    const mesh = tessellate({ kind: 'revolution', frame: { ...frame, centreAngle: 2 } });
    expect(mesh.indices.length).toBe(0);
  });
});

describe('rasterizeUv', () => {
  const geometry = cylinder();
  const frame = frameOf(geometry);
  const map = rasterOf(geometry);
  const pixels = covered(map);

  it('goes back to the pixel it came from within half a pixel', () => {
    expect(pixels.length).toBeGreaterThan(50_000);
    let worst = 0;
    for (let k = 0; k < pixels.length; k += 97) {
      const index = pixels[k] ?? 0;
      const [theta, s] = logoAngle(frame, map.u[index] ?? 0, map.v[index] ?? 0);
      const back = revolutionPoint(frame, theta, s);
      const x = (index % 600) + 0.5;
      const y = Math.floor(index / 600) + 0.5;
      worst = Math.max(worst, Math.hypot(back.x - x, back.y - y));
    }
    expect(worst).toBeLessThanOrEqual(0.5);
  });

  it('squeezes the logo towards the edges: pixels per unit of logo at θ are cos θ within 2 %', () => {
    const row = 300;
    const at = (x: number) => map.u[row * 600 + x] ?? 0;
    const density = (x: number) => 4 / (at(x + 2) - at(x - 2));
    const centre = density(300);
    for (const degrees of [30, 45, 55]) {
      const theta = (degrees * Math.PI) / 180;
      const x = Math.round(revolutionPoint(frame, theta, 0.5).x);
      expect(density(x) / centre / Math.cos(theta)).toBeGreaterThan(0.98);
      expect(density(x) / centre / Math.cos(theta)).toBeLessThan(1.02);
    }
  });

  it('draws nothing on the hidden side: a logo past 90° is cut at the silhouette', () => {
    const shifted = cylinder({ centreDegrees: 60, arcDegrees: 120 });
    const shiftedMap = rasterOf(shifted);
    const shiftedPixels = covered(shiftedMap);
    expect(shiftedPixels.length).toBeGreaterThan(10_000);
    const highest = Math.max(...shiftedPixels.map((index) => shiftedMap.u[index] ?? 0));
    // u = 0.75 is θ = 90°: nothing beyond, everything up to it.
    expect(highest).toBeLessThanOrEqual(0.75 + 1e-3);
    // The last half pixel before the silhouette spans the last few degrees.
    expect(highest).toBeGreaterThan(0.7);
    const edge = Math.max(...shiftedPixels.map((index) => index % 600));
    expect(edge).toBe(499);
  });

  it('softens the coverage over about a pixel before the silhouette', () => {
    const wide = rasterOf(cylinder({ arcDegrees: 180 }));
    const row = 300 * 600;
    expect(wide.coverage[row + 300]).toBe(1);
    expect(wide.coverage[row + 499] ?? 1).toBeLessThan(1);
    expect(wide.coverage[row + 501] ?? 0).toBe(0);
  });

  it('gives the homography of the equivalent quad when the arc shrinks to nothing', () => {
    const thin = frameOf(cylinder({ arcDegrees: 2, band: { from: 0.3, to: 0.7 } }));
    const thinMap = rasterizeUv(tessellate({ kind: 'revolution', frame: thin }), 600, 600);
    const corner = (u: number, v: number): readonly [number, number] => {
      const [theta, s] = logoAngle(thin, u, v);
      const p = revolutionPoint(thin, theta, s);
      return [p.x, p.y];
    };
    const h = computeHomography([corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)]);
    if (!h.ok) throw new Error('homography');
    const inverse = invertHomography(h.value);
    if (!inverse.ok) throw new Error('inverse');
    const thinPixels = covered(thinMap);
    expect(thinPixels.length).toBeGreaterThan(500);
    for (const index of thinPixels) {
      const back = applyHomography(inverse.value, [
        (index % 600) + 0.5,
        Math.floor(index / 600) + 0.5,
      ]);
      if (!back.ok) throw new Error('projection');
      const [u, v] = back.value;
      expect(Math.abs(u - (thinMap.u[index] ?? 0))).toBeLessThan(2e-2);
      expect(Math.abs(v - (thinMap.v[index] ?? 0))).toBeLessThan(2e-3);
    }
  });

  it('rasterises a Bezier mesh as its bilinear identity', () => {
    const grid: BezierGrid = {
      ...regular(4, 4, 200, 100),
      points: regular(4, 4, 200, 100).points.map(([x, y]) => [x + 50, y + 50]),
    };
    const meshMap = rasterizeUv(tessellate({ kind: 'mesh', grid }), 300, 200);
    const index = 100 * 300 + 150;
    expect(meshMap.u[index] ?? 0).toBeCloseTo(100.5 / 200, 2);
    expect(meshMap.v[index] ?? 0).toBeCloseTo(50.5 / 100, 2);
    expect(meshMap.coverage[index]).toBe(1);
    expect(meshMap.coverage[10 * 300 + 10]).toBe(0);
  });
});

describe('encodeUvMap', () => {
  it('writes the baked map format: 16 bits in red and green, coverage in blue', () => {
    const map: UvMap = {
      width: 2,
      height: 1,
      u: Float32Array.from([0.123456, 1]),
      v: Float32Array.from([0.987654, 0]),
      coverage: Float32Array.from([0.5, 1]),
      facing: Float32Array.from([0.25, 1]),
    };
    const { u, v } = encodeUvMap(map);
    expect(u.length).toBe(8);
    expect(Math.abs(decodeUv(u[0] ?? 0, u[1] ?? 0) - 0.123456)).toBeLessThanOrEqual(1 / 65535);
    expect(Math.abs(decodeUv(v[0] ?? 0, v[1] ?? 0) - 0.987654)).toBeLessThanOrEqual(1 / 65535);
    expect(decodeUv(u[4] ?? 0, u[5] ?? 0)).toBe(1);
    expect([u[2], u[3], u[6]]).toEqual([128, 255, 255]);
    expect(v[3]).toBe(64);
  });
});
