import { computeHomography, type Quad } from '@app/mockup-engine';
import { describe, expect, it } from 'vitest';
import { cssMatrix } from './mockup-stage';

// The CSS matrix3d must send the corners of the UNIT × UNIT logo box onto the scene quad: that is what puts
// the real logo exactly on the photographed surface.
const UNIT = 1000;

function project(matrix: string, x: number, y: number): [number, number] {
  const m = (/matrix3d\((.+)\)/u.exec(matrix)?.[1] ?? '').split(',').map(Number);
  const at = (index: number): number => m[index] ?? NaN;
  const w = at(3) * x + at(7) * y + at(15);
  return [(at(0) * x + at(4) * y + at(12)) / w, (at(1) * x + at(5) * y + at(13)) / w];
}

describe('computed mockup placement', () => {
  it('maps the logo box corners onto the surface quad', () => {
    const quad: Quad = [
      [1020, 960],
      [2514, 555],
      [2754, 1284],
      [1284, 1686],
    ];
    const h = computeHomography(quad);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const matrix = cssMatrix(h.value);
    const corners: readonly (readonly [number, number])[] = [
      [0, 0],
      [UNIT, 0],
      [UNIT, UNIT],
      [0, UNIT],
    ];
    corners.forEach(([x, y], index) => {
      const [px, py] = project(matrix, x, y);
      expect(px).toBeCloseTo(quad[index]?.[0] ?? NaN, 3);
      expect(py).toBeCloseTo(quad[index]?.[1] ?? NaN, 3);
    });
  });
});
