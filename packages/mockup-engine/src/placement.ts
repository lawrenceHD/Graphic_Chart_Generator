import type { SceneSurface } from '@app/contracts';
import { applyHomography, type Homography, type Point } from './homography.js';

/** Logo rectangle inside the surface's unit square (u to the right, v down). */
export type LogoRect = {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
};

/**
 * `contain` placement with a uniform physical margin (06_MOCKUP_ENGINE §3): the printable box is
 * `aspect × 1`; the margin is `paddingRatio × min(aspect, 1)` on every side.
 */
export function placeLogo(box: SceneSurface['logoBox'], logoAspect: number): LogoRect {
  const margin = box.paddingRatio * Math.min(box.aspect, 1);
  const innerWidth = box.aspect - 2 * margin;
  const innerHeight = 1 - 2 * margin;
  const widthLimited = innerWidth / logoAspect <= innerHeight;
  const width = widthLimited ? innerWidth : innerHeight * logoAspect;
  const height = widthLimited ? innerWidth / logoAspect : innerHeight;
  const u0 = (box.aspect - width) / 2 / box.aspect;
  const v0 = (1 - height) / 2;
  return { u0, v0, u1: u0 + width / box.aspect, v1: v0 + height };
}

/**
 * Raster size of the logo before projection (§4.2): at least 1.5 × the projected size, so the
 * logo is never enlarged from a thumbnail. Keeps the logo aspect ratio.
 */
export function logoRasterSize(
  h: Homography,
  rect: LogoRect,
  logoAspect: number,
): { readonly width: number; readonly height: number } {
  const corner = (u: number, v: number): Point => {
    const projected = applyHomography(h, [u, v]);
    return projected.ok ? projected.value : [NaN, NaN];
  };
  const tl = corner(rect.u0, rect.v0);
  const tr = corner(rect.u1, rect.v0);
  const br = corner(rect.u1, rect.v1);
  const bl = corner(rect.u0, rect.v1);
  const length = (p: Point, q: Point): number => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const horizontal = Math.max(length(tl, tr), length(bl, br));
  const vertical = Math.max(length(tl, bl), length(tr, br));
  const width = Math.ceil(1.5 * Math.max(horizontal, vertical * logoAspect));
  return { width, height: Math.ceil(width / logoAspect) };
}
