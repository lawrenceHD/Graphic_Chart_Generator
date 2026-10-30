import { describe, expect, it } from 'vitest';
import { SceneCategory, SceneDefinition } from './mockup-scene.js';

const validScene = () => ({
  id: 'business-card-01',
  schemaVersion: 1,
  category: 'stationery',
  size: { width: 3840, height: 2160 },
  surfaces: [
    {
      id: 'front',
      quad: [
        [1210, 640],
        [2480, 705],
        [2430, 1390],
        [1175, 1320],
      ],
      logoBox: { aspect: 1.75, fit: 'contain', paddingRatio: 0.18 },
      baseTint: [0.96, 0.95, 0.93],
      light: { direction: [-0.4, -0.6, 0.69] },
      finishes: ['flat', 'emboss', 'foil'],
    },
  ],
});

type Scene = ReturnType<typeof validScene>;
type Surface = Scene['surfaces'][number];

const rejects = (mutate: (scene: Scene) => unknown): void => {
  expect(SceneDefinition.safeParse(mutate(validScene())).success).toBe(false);
};

const rejectsSurface = (patch: (surface: Surface) => Record<string, unknown>): void => {
  rejects((scene) => ({ ...scene, surfaces: scene.surfaces.map((surface) => patch(surface)) }));
};

describe('SceneDefinition (06_MOCKUP_ENGINE §3)', () => {
  it('accepts the reference scene.json of the spec', () => {
    const parsed = SceneDefinition.parse(validScene());
    expect(parsed.surfaces[0]?.quad[2]).toEqual([2430, 1390]);
  });

  it('lists the MVP scene categories with generic as fallback', () => {
    expect(SceneCategory.options).toEqual([
      'stationery',
      'digital',
      'signage',
      'generic',
      'hospitality',
      'packaging',
      'apparel',
    ]);
  });

  it('rejects unknown keys, versions and categories', () => {
    rejects((s) => ({ ...s, extra: true }));
    rejects((s) => ({ ...s, schemaVersion: 3 }));
    rejects((s) => ({ ...s, category: 'bottles' }));
    rejects((s) => ({ ...s, id: 'Business Card' }));
  });

  it('rejects quads that are not 4 integer corners inside the scene', () => {
    const withCorner = (index: number, corner: readonly number[]) => (surface: Surface) => ({
      ...surface,
      quad: surface.quad.map((point, i) => (i === index ? corner : point)),
    });
    rejectsSurface(withCorner(0, [1210.5, 640]));
    rejectsSurface(withCorner(1, [3841, 705]));
    rejectsSurface(withCorner(3, [-1, 1320]));
    rejectsSurface((surface) => ({ ...surface, quad: surface.quad.slice(0, 3) }));
  });

  it('rejects an out-of-range logo box, tint or light', () => {
    rejectsSurface((s) => ({ ...s, logoBox: { ...s.logoBox, paddingRatio: 0.5 } }));
    rejectsSurface((s) => ({ ...s, logoBox: { ...s.logoBox, aspect: 0 } }));
    rejectsSurface((s) => ({ ...s, baseTint: [1.2, 0.95, 0.93] }));
    rejectsSurface((s) => ({ ...s, light: { direction: [1, 1, 1] } }));
  });

  it('rejects empty or duplicated surfaces and finishes', () => {
    rejects((s) => ({ ...s, surfaces: [] }));
    rejects((s) => ({ ...s, surfaces: [...s.surfaces, ...s.surfaces] }));
    rejectsSurface((s) => ({ ...s, finishes: [] }));
    rejectsSurface((s) => ({ ...s, finishes: ['flat', 'flat'] }));
    rejectsSurface((s) => ({ ...s, finishes: ['gloss'] }));
  });

  it('v2: a surface carries its mask, material and the brand colour painted on it', () => {
    const scene = {
      ...validScene(),
      schemaVersion: 2,
      category: 'hospitality',
      surfaces: [
        {
          ...validScene().surfaces[0],
          mask: 'mask-front.png',
          material: 'card',
          paint: ['primary', 'neutralLight'],
          finishes: ['print', 'foil', 'emboss'],
        },
      ],
    };

    expect(SceneDefinition.safeParse(scene).success).toBe(true);
    // The mask is a file beside scene.json, never a path out of the scene folder.
    const outside = { ...scene, surfaces: [{ ...scene.surfaces[0], mask: '../x.png' }] };
    expect(SceneDefinition.safeParse(outside).success).toBe(false);
    const unknownPaint = { ...scene, surfaces: [{ ...scene.surfaces[0], paint: ['gold'] }] };
    expect(SceneDefinition.safeParse(unknownPaint).success).toBe(false);
  });
});
