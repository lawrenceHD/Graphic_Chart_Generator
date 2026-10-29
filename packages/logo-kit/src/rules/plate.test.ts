import { sanitizeSvg } from '@app/svg-engine';
import { describe, expect, it } from 'vitest';
import type { LogoMeasure } from './measure.js';
import { clearSpacePlateSvg } from './plate.js';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const result = sanitizeSvg(
  encode(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="10" y="10" width="60" height="80" fill="#1F4BFF"/><rect x="90" y="40" width="100" height="30" fill="#12161F"/></svg>',
  ),
);
if (!result.ok) throw new Error(result.error.code);
const logo = result.value.svg;
const bbox = { x: 10, y: 10, width: 180, height: 80 };
const minimum = { heightPx: 24, widthPx: 54, heightMm: 5, widthMm: 11.5 };
const byElement: LogoMeasure = {
  bbox,
  clearSpace: { x: 30, source: 'element', element: { x: 90, y: 40, width: 100, height: 30 } },
  minimum,
};
const byConvention: LogoMeasure = { bbox, clearSpace: { x: 20, source: 'convention' }, minimum };
const accepted = (svg: string): boolean => {
  const sanitized = sanitizeSvg(encode(svg));
  return sanitized.ok && sanitized.value.svg === svg;
};

describe('clear space plate (R6)', () => {
  it('shows the reference element as a ghost on the four sides, clipped from the real logo', () => {
    const plate = clearSpacePlateSvg(logo, byElement);
    if (!plate.ok) throw new Error(plate.error);
    expect(accepted(plate.value.svg)).toBe(true);
    expect(plate.value.svg).toContain('<clipPath');
    expect(plate.value.svg.match(/clip-path="url\(#charta-x-element\)"/g)).toHaveLength(4);
    // Left and right ghosts are turned a quarter so that their height spans the horizontal margin.
    expect(plate.value.svg.match(/rotate\((-?90)\)/g)).toHaveLength(2);
  });

  it('draws the zone x around the logo and two dimension lines, labelled outside the SVG', () => {
    const plate = clearSpacePlateSvg(logo, byElement);
    if (!plate.ok) throw new Error(plate.error);
    expect(plate.value.zone).toEqual({ x: -20, y: -20, width: 240, height: 140 });
    expect(plate.value.svg).toContain('stroke-dasharray');
    expect(plate.value.labels).toHaveLength(2);
    const [vx, vy, vw, vh] = plate.value.viewBox;
    for (const label of plate.value.labels) {
      expect(label.text).toBe('x');
      expect(label.x).toBeGreaterThan(vx);
      expect(label.x).toBeLessThan(vx + vw);
      expect(label.y).toBeGreaterThan(vy);
      expect(label.y).toBeLessThan(vy + vh);
      // Outside the zone, never on the logo or its clear space.
      const inside = label.x > -20 && label.x < 220 && label.y > -20 && label.y < 120;
      expect(inside).toBe(false);
    }
  });

  it('marks the corners with x squares when x is a convention, without any ghost', () => {
    const plate = clearSpacePlateSvg(logo, byConvention);
    if (!plate.ok) throw new Error(plate.error);
    expect(plate.value.svg).not.toContain('clipPath');
    expect(plate.value.svg.match(/<rect [^>]*height="20"[^>]*width="20"/g)).toHaveLength(4);
    expect(accepted(plate.value.svg)).toBe(true);
  });
});
