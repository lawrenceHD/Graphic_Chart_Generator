import { describe, expect, it } from 'vitest';
import { mappingAspect, parseScene, surfaceMapping } from './scene.js';

const scene = (quad: readonly (readonly [number, number])[]) => ({
  id: 'poster-01',
  schemaVersion: 1,
  category: 'signage',
  size: { width: 3840, height: 2160 },
  surfaces: [
    {
      id: 'front',
      quad,
      logoBox: { aspect: 0.7, fit: 'contain', paddingRatio: 0.2 },
      baseTint: [1, 1, 1],
      light: { direction: [0, 0, 1] },
      finishes: ['flat', 'emboss'],
    },
  ],
});

describe('parseScene — validation at load time (06_MOCKUP_ENGINE §3, §5)', () => {
  it('returns the scene with a homography per surface', () => {
    const result = parseScene(
      scene([
        [100, 50],
        [420, 80],
        [400, 300],
        [120, 260],
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scene.id).toBe('poster-01');
    expect(result.value.homographies.get('front')?.[2]).toBe(100);
  });

  it('refuses malformed JSON shapes with SCENE_INVALID and the Zod paths', () => {
    const result = parseScene({ id: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('SCENE_INVALID');
    expect(result.error.issues.some((issue) => issue.startsWith('schemaVersion: '))).toBe(true);
  });

  it('refuses a well-formed scene whose quad is not a convex, unmirrored quad', () => {
    const result = parseScene(
      scene([
        [100, 50],
        [120, 260],
        [400, 300],
        [420, 80],
      ]),
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'SCENE_INVALID', issues: ['surfaces.0.quad: mirrored'] },
    });
  });
});

describe('parseScene — computed surfaces (ADR-034)', () => {
  const quad: readonly (readonly [number, number])[] = [
    [100, 100],
    [500, 100],
    [500, 500],
    [100, 500],
  ];
  const withGeometry = (front: readonly [number, number]) => {
    const base = scene(quad);
    const [surface] = base.surfaces;
    return {
      ...base,
      schemaVersion: 2,
      surfaces: [
        {
          ...surface,
          geometry: {
            kind: 'revolution',
            top: { left: [100, 100], right: [500, 100], front },
            bottom: { left: [100, 500], right: [500, 500], front: [300, 540] },
            band: { from: 0.1, to: 0.9 },
            arcDegrees: 120,
          },
        },
      ],
    };
  };

  it('maps a flat surface by its homography and a revolution by its frame', () => {
    const flat = parseScene(scene(quad));
    expect(flat.ok && flat.value.mappings.get('front')?.kind).toBe('homography');
    const curved = parseScene(withGeometry([300, 140]));
    expect(curved.ok).toBe(true);
    if (!curved.ok) return;
    const mapping = curved.value.mappings.get('front');
    expect(mapping?.kind).toBe('revolution');
    expect(curved.value.homographies.has('front')).toBe(true);
  });

  it('refuses a revolution whose front point is off its axis, with the path', () => {
    const result = parseScene(withGeometry([380, 140]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues).toEqual([
      'surfaces.0.geometry: top: the front point is not on the axis of the ellipse',
    ]);
  });
});

describe('surfaceMapping', () => {
  it('gives the logo box aspect of a revolution and none for a flat quad', () => {
    const curved = surfaceMapping({
      kind: 'revolution',
      top: { left: [100, 100], right: [500, 100], front: [300, 140] },
      bottom: { left: [100, 500], right: [500, 500], front: [300, 540] },
      band: { from: 0, to: 1 },
      arcDegrees: 90,
      centreDegrees: 0,
    });
    expect(curved.ok).toBe(true);
    if (!curved.ok) return;
    expect(mappingAspect(curved.value)).toBeCloseTo(
      (200 * (Math.PI / 2)) / (400 / Math.sqrt(1 - 0.04)),
      6,
    );
    const flat = surfaceMapping({
      kind: 'quad',
      quad: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    });
    expect(flat.ok && mappingAspect(flat.value)).toBeNull();
  });
});
