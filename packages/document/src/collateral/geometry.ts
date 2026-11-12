import type { Box } from '@app/contracts';

const EPS = 1e-6;

// The sheet of one collateral: trim size, bleed and grid, in the unit of the format.
export type Frame = {
  readonly width: number;
  readonly height: number;
  readonly bleed: number;
  readonly safety: number;
  readonly module: number;
  readonly margin: number;
  readonly baseline: number;
};

/** Columns c1..c2 and rows r1..r2 of modules (from 1), clamped to the trim. */
export function cells(frame: Frame, c1: number, c2: number, r1: number, r2: number): Box {
  const x = (c1 - 1) * frame.module;
  const y = (r1 - 1) * frame.module;
  return {
    x,
    y,
    w: Math.min(c2 * frame.module, frame.width) - x,
    h: Math.min(r2 * frame.module, frame.height) - y,
  };
}

/** The same box pushed into the bleed on every side that touches the trim. */
export function toBleed(frame: Frame, box: Box): Box {
  const left = box.x <= EPS ? -frame.bleed : box.x;
  const top = box.y <= EPS ? -frame.bleed : box.y;
  const right = box.x + box.w >= frame.width - EPS ? frame.width + frame.bleed : box.x + box.w;
  const bottom = box.y + box.h >= frame.height - EPS ? frame.height + frame.bleed : box.y + box.h;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function sheet(frame: Frame): Box {
  return toBleed(frame, { x: 0, y: 0, w: frame.width, h: frame.height });
}

/** Inside the margins: where text and logo go. */
export function content(frame: Frame): Box {
  return inset({ x: 0, y: 0, w: frame.width, h: frame.height }, frame.margin);
}

export function inset(box: Box, by: number): Box {
  return {
    x: box.x + by,
    y: box.y + by,
    w: Math.max(0, box.w - 2 * by),
    h: Math.max(0, box.h - 2 * by),
  };
}

export function intersect(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x);
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y);
  return { x, y, w, h };
}

export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
  );
}

/** Moves the top of a box down to the next baseline row, keeping its bottom. */
export function onBaseline(box: Box, baseline: number): Box {
  const y = Math.ceil(box.y / baseline - EPS) * baseline;
  return { ...box, y, h: Math.max(0, box.h - (y - box.y)) };
}
