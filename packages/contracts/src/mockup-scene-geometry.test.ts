import { describe, expect, it } from 'vitest';
import { PsdSceneSchema, SceneDefinition, SurfaceGeometry } from './mockup-scene.js';

// ADR-034: computed surfaces (revolution, Bezier mesh) beside the flat quad.

const revolution = () => ({
  kind: 'revolution',
  top: { left: [783, 603], right: [1504, 603], front: [1144, 654] },
  bottom: { left: [791, 1180], right: [1501, 1180], front: [1146, 1242] },
  band: { from: 0.25, to: 0.92 },
  arcDegrees: 120,
});

const grid = (cols: number, rows: number) => ({
  kind: 'mesh',
  cols,
  rows,
  points: Array.from({ length: cols * rows }, (_, index) => [
    (index % cols) * 10,
    Math.floor(index / cols) * 10,
  ]),
});

const photoScene = (geometry: unknown) => ({
  id: 'mug-01',
  schemaVersion: 2,
  category: 'hospitality',
  size: { width: 2400, height: 1594 },
  surfaces: [
    {
      id: 'body',
      quad: [
        [783, 603],
        [1504, 603],
        [1501, 1180],
        [791, 1180],
      ],
      geometry,
      logoBox: { aspect: 1.5, fit: 'contain', paddingRatio: 0.1 },
      baseTint: [1, 1, 1],
      light: { direction: [0, 0, 1] },
      finishes: ['print'],
    },
  ],
});

const psdScene = (slot: Record<string, unknown>) => ({
  id: 'mug-white',
  kind: 'psd',
  schemaVersion: 3,
  size: { width: 2400, height: 1594 },
  layers: [
    { type: 'image', src: 'base.webp', blend: 'normal', opacity: 1 },
    {
      type: 'slot',
      id: 'slot-1',
      role: 'mug-logo',
      aspect: 1,
      blend: 'normal',
      opacity: 1,
      ...slot,
    },
  ],
});

describe('SurfaceGeometry (ADR-034)', () => {
  it('accepts a cylinder given by two ellipses of three points, the centre defaulting to the front', () => {
    const parsed = SurfaceGeometry.parse(revolution());
    expect(parsed.kind).toBe('revolution');
    if (parsed.kind !== 'revolution') return;
    expect(parsed.centreDegrees).toBe(0);
    expect(parsed.top.front).toEqual([1144, 654]);
  });

  it('accepts a cone ratio and a silhouette profile', () => {
    const parsed = SurfaceGeometry.safeParse({
      ...revolution(),
      radiusRatio: 1.3,
      profile: [
        [783, 603],
        [770, 900],
        [791, 1180],
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses an empty or reversed band and an arc beyond half a turn', () => {
    expect(
      SurfaceGeometry.safeParse({ ...revolution(), band: { from: 0.5, to: 0.5 } }).success,
    ).toBe(false);
    expect(
      SurfaceGeometry.safeParse({ ...revolution(), band: { from: 0.9, to: 0.2 } }).success,
    ).toBe(false);
    expect(SurfaceGeometry.safeParse({ ...revolution(), arcDegrees: 200 }).success).toBe(false);
    expect(SurfaceGeometry.safeParse({ ...revolution(), centreDegrees: 120 }).success).toBe(false);
  });

  it('accepts a Bezier grid of (3k+1) x (3m+1) points, row by row', () => {
    expect(SurfaceGeometry.safeParse(grid(4, 4)).success).toBe(true);
    expect(SurfaceGeometry.safeParse(grid(7, 4)).success).toBe(true);
  });

  it('refuses a grid whose sides are not 3k+1 or whose point count does not match', () => {
    expect(SurfaceGeometry.safeParse(grid(5, 4)).success).toBe(false);
    expect(
      SurfaceGeometry.safeParse({ ...grid(4, 4), points: grid(4, 4).points.slice(1) }).success,
    ).toBe(false);
  });

  it('keeps the flat quad as a geometry', () => {
    const quad = {
      kind: 'quad',
      quad: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    };
    expect(SurfaceGeometry.safeParse(quad).success).toBe(true);
  });
});

describe('SceneDefinition with a computed surface', () => {
  it('keeps a scene without geometry valid (no scene changes)', () => {
    const scene = photoScene(undefined);
    expect(SceneDefinition.safeParse(scene).success).toBe(true);
  });

  it('accepts a revolution surface inside the picture', () => {
    expect(SceneDefinition.safeParse(photoScene(revolution())).success).toBe(true);
  });

  it('refuses a geometry point outside the picture', () => {
    const outside = { ...revolution(), bottom: { ...revolution().bottom, front: [1146, 1700] } };
    expect(SceneDefinition.safeParse(photoScene(outside)).success).toBe(false);
    const grid4 = grid(4, 4);
    const far = { ...grid4, points: grid4.points.map(([x, y]) => [(x ?? 0) + 2400, y]) };
    expect(SceneDefinition.safeParse(photoScene(far)).success).toBe(false);
  });
});

describe('PsdSceneSchema slot geometry', () => {
  it('still accepts a baked slot with its uv and vv maps', () => {
    expect(
      PsdSceneSchema.safeParse(psdScene({ uv: 'uv-slot-1.png', vv: 'vv-slot-1.png' })).success,
    ).toBe(true);
  });

  it('accepts a slot whose map is computed from a geometry', () => {
    expect(PsdSceneSchema.safeParse(psdScene({ geometry: revolution() })).success).toBe(true);
  });

  it('refuses a slot with neither maps nor geometry, with both, or with one map only', () => {
    expect(PsdSceneSchema.safeParse(psdScene({})).success).toBe(false);
    expect(
      PsdSceneSchema.safeParse(
        psdScene({ uv: 'uv-slot-1.png', vv: 'vv-slot-1.png', geometry: revolution() }),
      ).success,
    ).toBe(false);
    expect(PsdSceneSchema.safeParse(psdScene({ uv: 'uv-slot-1.png' })).success).toBe(false);
  });

  it('refuses a slot geometry outside the picture', () => {
    const outside = { ...revolution(), top: { ...revolution().top, right: [2600, 603] } };
    expect(PsdSceneSchema.safeParse(psdScene({ geometry: outside })).success).toBe(false);
  });
});
