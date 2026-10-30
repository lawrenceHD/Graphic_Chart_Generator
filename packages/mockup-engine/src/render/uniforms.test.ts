import { describe, expect, it } from 'vitest';
import { computeHomography } from '../homography.js';
import { linearHex, surfaceUniforms, type UniformInput } from './uniforms.js';

const quad = [
  [100, 50],
  [420, 80],
  [400, 300],
  [120, 260],
] as const;

function input(patch: Partial<UniformInput> = {}): UniformInput {
  const h = computeHomography(quad);
  if (!h.ok) throw new Error('quad');
  return {
    homography: h.value,
    rect: { u0: 0, v0: 0, u1: 1, v1: 1 },
    paint: null,
    tint: [0.95, 0.95, 0.95],
    finish: 'print',
    material: 'card',
    light: [0, 0, 1],
    foil: 'gold',
    logoWidth: 1024,
    ...patch,
  };
}

/** Applies the column-major matrix the shader receives to a scene pixel. */
function toUnit(m: readonly number[], [x, y]: readonly [number, number]): [number, number] {
  const at = (i: number) => m[i] ?? 0;
  const u = at(0) * x + at(3) * y + at(6);
  const v = at(1) * x + at(4) * y + at(7);
  const w = at(2) * x + at(5) * y + at(8);
  return [u / w, v / w];
}

describe('surfaceUniforms — what the surface shader receives', () => {
  it('sends the inverse projection column-major: each quad corner lands on its unit corner', () => {
    const uniforms = surfaceUniforms(input());
    if (uniforms === null) throw new Error('singular');
    const corners = quad.map((corner) => toUnit(uniforms.inverse, corner));

    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].forEach(([u, v], index) => {
      expect(corners[index]?.[0]).toBeCloseTo(u ?? -1, 6);
      expect(corners[index]?.[1]).toBeCloseTo(v ?? -1, 6);
    });
  });

  it('blends paint in linear light', () => {
    expect(linearHex('#FFFFFF')).toEqual([1, 1, 1]);
    expect(linearHex('#808080')[0]).toBeCloseTo(0.2159, 4);
    expect(surfaceUniforms(input({ paint: '#000000' }))?.paint).toEqual([0, 0, 0]);
  });

  it('moves the print with the folds of fabric only, and sizes the relief to the projection', () => {
    expect(surfaceUniforms(input({ material: 'fabric' }))?.displace).toBeGreaterThan(0);
    expect(surfaceUniforms(input({ material: 'card' }))?.displace).toBe(0);
    // 1024 texels over the 320 px top edge: 3.2 texels a pixel, a relief 2.5 px wide → log2(8).
    expect(surfaceUniforms(input())?.logoLod).toBeCloseTo(
      Math.log2((1024 / Math.hypot(320, 30)) * 2.5),
      6,
    );
  });
});
