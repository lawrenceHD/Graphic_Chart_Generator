import type { SceneSurface } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import {
  applyHomography,
  type Homography,
  type Point,
  type ProjectionError,
} from './homography.js';

/** Logo rectangle inside the surface's unit square (u to the right, v down). */
export type LogoRect = {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
};

export type PlacementError = { readonly code: 'INVALID_LOGO_ASPECT' };

const isValidAspect = (aspect: number): boolean => Number.isFinite(aspect) && aspect > 0;

/**
 * `contain` placement with a uniform physical margin (06_MOCKUP_ENGINE §3): the printable box is
 * `aspect × 1`; the margin is `paddingRatio × min(aspect, 1)` on every side. The box comes from a
 * validated scene (paddingRatio < 0.5), so the inner box is never empty.
 */
export function placeLogo(
  box: SceneSurface['logoBox'],
  logoAspect: number,
): Result<LogoRect, PlacementError> {
  if (!isValidAspect(logoAspect)) return err({ code: 'INVALID_LOGO_ASPECT' });
  const margin = box.paddingRatio * Math.min(box.aspect, 1);
  const innerWidth = box.aspect - 2 * margin;
  const innerHeight = 1 - 2 * margin;
  const widthLimited = innerWidth / logoAspect <= innerHeight;
  const width = widthLimited ? innerWidth : innerHeight * logoAspect;
  const height = widthLimited ? innerWidth / logoAspect : innerHeight;
  const u0 = (box.aspect - width) / 2 / box.aspect;
  const v0 = (1 - height) / 2;
  return ok({ u0, v0, u1: u0 + width / box.aspect, v1: v0 + height });
}

/**
 * Raster size of the logo before projection (§4.2): at least 1.5 × the projected size, so the
 * logo is never enlarged from a thumbnail. Keeps the logo aspect ratio.
 */
export function logoRasterSize(
  h: Homography,
  rect: LogoRect,
  logoAspect: number,
): Result<{ readonly width: number; readonly height: number }, PlacementError | ProjectionError> {
  if (!isValidAspect(logoAspect)) return err({ code: 'INVALID_LOGO_ASPECT' });
  const corners: Point[] = [];
  for (const uv of [
    [rect.u0, rect.v0],
    [rect.u1, rect.v0],
    [rect.u1, rect.v1],
    [rect.u0, rect.v1],
  ] as const) {
    const projected = applyHomography(h, uv);
    if (!projected.ok) return projected;
    corners.push(projected.value);
  }
  const [tl = [0, 0], tr = [0, 0], br = [0, 0], bl = [0, 0]] = corners;
  const length = (p: Point, q: Point): number => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const horizontal = Math.max(length(tl, tr), length(bl, br));
  const vertical = Math.max(length(tl, bl), length(tr, br));
  const width = Math.ceil(1.5 * Math.max(horizontal, vertical * logoAspect));
  return ok({ width, height: Math.ceil(width / logoAspect) });
}
