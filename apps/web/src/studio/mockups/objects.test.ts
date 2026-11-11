import type { PsdScene, SceneDefinition } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import {
  availableLogos,
  boundsOf,
  exportFileName,
  pickObject,
  photoObjects,
  pointInPolygon,
  psdObjects,
} from './objects';

const photo: SceneDefinition = {
  id: 'sign',
  schemaVersion: 2,
  category: 'signage',
  size: { width: 100, height: 80 },
  surfaces: [
    {
      id: 'panel',
      quad: [
        [10, 10],
        [60, 10],
        [60, 50],
        [10, 50],
      ],
      logoBox: { aspect: 2, fit: 'contain', paddingRatio: 0.1 },
      baseTint: [0.5, 0.5, 0.5],
      light: { direction: [0, 0, 1] },
      paint: ['primary', 'none'],
      finishes: ['print', 'foil'],
    },
    {
      id: 'plain',
      quad: [
        [70, 10],
        [90, 10],
        [90, 50],
        [70, 50],
      ],
      logoBox: { aspect: 2, fit: 'contain', paddingRatio: 0.1 },
      baseTint: [0.5, 0.5, 0.5],
      light: { direction: [0, 0, 1] },
      finishes: ['print'],
    },
  ],
};

const psd: PsdScene = {
  id: 'cards',
  kind: 'psd',
  schemaVersion: 3,
  size: { width: 100, height: 80 },
  layers: [
    { type: 'paint', mask: 'mask-0.png', paint: ['neutralLight'], opacity: 1 },
    { type: 'image', src: 'layer-2.png', blend: 'normal', opacity: 1 },
    { type: 'paint', mask: 'mask-1.png', paint: ['primary'], opacity: 1 },
  ],
};

describe('photoObjects', () => {
  it('lists the surfaces with what the scene lets each one take', () => {
    const [panel, plain] = photoObjects(photo);
    expect(panel).toMatchObject({
      id: 'panel',
      kind: 'surface',
      paints: ['primary', 'accent', 'neutralLight', 'neutralDark'],
      original: true,
      finishes: ['print', 'foil'],
    });
    expect(panel?.outline).toEqual(photo.surfaces[0]?.quad);
    expect(plain).toMatchObject({ paints: [], original: true, finishes: ['print'] });
  });

  it('offers no colour on a surface that is not paintable', () => {
    expect(photoObjects(photo)[1]?.paints).toEqual([]);
  });
});

describe('psdObjects', () => {
  it('lists the paint layers as fields, numbered among the paint layers', () => {
    const objects = psdObjects(psd);
    expect(objects.map((object) => object.id)).toEqual(['field-0', 'field-1']);
    expect(objects[0]).toMatchObject({
      kind: 'paint',
      paints: ['primary', 'accent', 'neutralLight', 'neutralDark'],
      finishes: [],
      outline: null,
    });
  });
});

describe('availableLogos', () => {
  it('offers only the versions that exist', () => {
    expect(availableLogos({ 'mono-black': null, 'mono-white': null })).toEqual(['color']);
    expect(availableLogos({ 'mono-black': '/b.svg', 'mono-white': null })).toEqual([
      'color',
      'black',
    ]);
    expect(availableLogos({ 'mono-black': '/b.svg', 'mono-white': '/w.svg' })).toEqual([
      'color',
      'black',
      'white',
    ]);
  });
});

describe('hit testing', () => {
  const square: readonly (readonly [number, number])[] = [
    [10, 10],
    [20, 10],
    [20, 20],
    [10, 20],
  ];

  it('knows a point inside a polygon from a point outside', () => {
    expect(pointInPolygon(15, 15, square)).toBe(true);
    expect(pointInPolygon(25, 15, square)).toBe(false);
  });

  it('picks the topmost object at a point, or none', () => {
    const hits = [
      { id: 'below', hit: () => true },
      { id: 'above', hit: (x: number) => x > 5 },
    ];
    expect(pickObject(hits, 9, 0)).toBe('above');
    expect(pickObject(hits, 1, 0)).toBe('below');
    expect(pickObject([{ id: 'a', hit: () => false }], 0, 0)).toBeNull();
  });

  it('finds the bounds of a mask', () => {
    const mask = { width: 4, height: 3, data: new Uint8ClampedArray(12) };
    mask.data[1 * 4 + 1] = 255;
    mask.data[2 * 4 + 2] = 255;
    expect(boundsOf(mask)).toEqual([
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ]);
    expect(boundsOf({ width: 2, height: 2, data: new Uint8ClampedArray(4) })).toBeNull();
  });
});

describe('exportFileName', () => {
  it('builds a clean file name from the brand and the scene', () => {
    expect(exportFileName('Café de l’Île', 'cards-floating')).toBe(
      'cafe-de-l-ile-cards-floating.png',
    );
    expect(exportFileName('   ', 'mug-white')).toBe('charta-mug-white.png');
  });
});
