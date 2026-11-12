import { PsdSceneSchema } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import {
  BLEND_CODES,
  PSD_LAYER_SHADER,
  blendChannel,
  decodeUv,
  guardGradient,
} from './psd.js';

describe('PSD scenes — Photoshop layers replayed', () => {
  it('blends like Photoshop on gamma-encoded values', () => {
    expect(blendChannel(BLEND_CODES.multiply, 0.5, 0.5)).toBeCloseTo(0.25, 6);
    expect(blendChannel(BLEND_CODES.screen, 0.5, 0.5)).toBeCloseTo(0.75, 6);
    expect(blendChannel(BLEND_CODES.overlay, 0.25, 0.5)).toBeCloseTo(0.25, 6);
    expect(blendChannel(BLEND_CODES.overlay, 0.75, 0.5)).toBeCloseTo(0.75, 6);
    expect(blendChannel(BLEND_CODES.normal, 0.2, 0.9)).toBe(0.9);
    // A white artwork multiplied leaves the photographed paper as it is.
    expect(blendChannel(BLEND_CODES.multiply, 0.83, 1)).toBeCloseTo(0.83, 6);
  });

  it('reads a 16-bit coordinate of the UV map', () => {
    expect(decodeUv(255, 255)).toBe(1);
    expect(decodeUv(0, 0)).toBe(0);
    expect(decodeUv(128, 0)).toBeCloseTo(0.50001, 4);
  });

  it('accepts a baked scene and refuses a file outside the scene folder', () => {
    const scene = {
      id: 'cards-floating',
      kind: 'psd',
      schemaVersion: 3,
      size: { width: 2400, height: 1663 },
      layers: [
        { type: 'image', src: 'base.webp', blend: 'normal', opacity: 1 },
        { type: 'paint', mask: 'mask-1.png', paint: ['neutralLight'], opacity: 1 },
        {
          type: 'slot',
          id: 'slot-2',
          role: 'card-front',
          aspect: 1.545,
          blend: 'multiply',
          opacity: 1,
          uv: 'uv-slot-2.png',
          vv: 'vv-slot-2.png',
        },
      ],
    };
    expect(PsdSceneSchema.safeParse(scene).success).toBe(true);
    const escaping = { ...scene, layers: [{ ...scene.layers[0], src: '../secret.png' }] };
    expect(PsdSceneSchema.safeParse(escaping).success).toBe(false);
  });

  it('drops the derivative only towards a neighbour outside the map, read on the coverage', () => {
    // Inside the map one pixel moves a fraction of the artwork: the derivatives choose the mip level.
    expect(guardGradient([0.001, 0.0005], [0, 0.002], 1, [0, 0])).toEqual([
      [0.001, 0.0005],
      [0, 0.002],
    ]);
    // Near the silhouette of a squashed cylinder the step is large but real: it is kept.
    expect(guardGradient([0.3, 0], [0, 0.002], 0.4, [-0.1, 0])).toEqual([
      [0.3, 0],
      [0, 0.002],
    ]);
    // Across the edge of the map the neighbour has no coverage and reads (0, 0): that axis only drops.
    expect(guardGradient([0.6, 0], [0, 0.002], 1, [-1, 0])).toEqual([
      [0, 0],
      [0, 0.002],
    ]);
    expect(guardGradient([0.001, 0], [0.5, 0.4], 0.7, [0, 0.7])).toEqual([
      [0.001, 0],
      [0, 0],
    ]);
    expect(PSD_LAYER_SHADER).toContain('textureGrad(uSource, uv');
    expect(PSD_LAYER_SHADER).toContain('abs(dFdx(eu.b))');
  });
});
