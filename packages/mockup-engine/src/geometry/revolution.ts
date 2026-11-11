import type { SurfaceGeometry } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';

// Surfaces of revolution (ADR-034, 06_MOCKUP_ENGINE §4.5): a mug, a cup or a bottle given by its top and
// bottom ellipses, three points each. Scene pixels, y down. θ is measured on the object from the point
// nearest the viewer (0 in front); s runs from the top ellipse (0) to the bottom one (1).
//
// A circle seen by a pinhole camera is a projective image of the unit circle:
//   p(θ) = c + [a·√(1−κ²)·sin θ·e + b·(cos θ − κ)·n] / (1 − κ·cos θ)
// with κ = radius·cos(tilt) / depth. The left and right extremes of the ellipse are then at cos θ = κ (one
// sees a little less than half the object) and the front at θ = 0. κ comes from the focal length, read
// from how much more open the lower ellipse is than the upper one; κ = 0 is the orthographic view.

export type Vec2 = readonly [number, number];
export type RevolutionGeometry = Extract<SurfaceGeometry, { readonly kind: 'revolution' }>;
export type GeometryError = { readonly code: 'GEOMETRY_INVALID'; readonly reason: string };

export interface Ellipse {
  readonly centre: Vec2;
  /** Half of the silhouette width, along `axis`. */
  readonly a: number;
  /** Signed offset of the front point along `normal`: positive when it is below the centre. */
  readonly b: number;
  readonly axis: Vec2;
  readonly normal: Vec2;
  /** Perspective of the section (0 orthographic). */
  readonly kappa: number;
}

export interface RevolutionFrame {
  readonly top: Ellipse;
  readonly bottom: Ellipse;
  /** Physical radius of the top over the bottom. */
  readonly radiusRatio: number;
  /** Where the silhouettes meet (cone apex, cylinder vanishing point); null when they are parallel. */
  readonly vanishing: Vec2 | null;
  /** Focal length in pixels read from the two ellipses; null when they are equally open. */
  readonly focal: number | null;
  /** True height from the top to the bottom ellipse, in pixels at the scale of the radius. */
  readonly height: number;
  /** Width over height of the logo box laid on the object. */
  readonly aspect: number;
  readonly centreAngle: number;
  readonly arc: number;
  readonly band: { readonly from: number; readonly to: number };
  readonly profile: readonly Vec2[] | null;
  /** Width, in facing, of the soft edge before the silhouette (about one pixel). */
  readonly edge: number;
}

export interface SurfacePoint {
  readonly x: number;
  readonly y: number;
  /** 1 facing the viewer, 0 on the silhouette, negative on the hidden side. */
  readonly facing: number;
}

const FRONT_TOLERANCE = 0.1;
const MAX_KAPPA = 0.5;
const invalid = (reason: string): Result<never, GeometryError> =>
  err({ code: 'GEOMETRY_INVALID', reason });
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** The ellipse through its left and right extremes and its front point (orthographic, κ = 0). */
export function ellipseFrom3(points: {
  readonly left: Vec2;
  readonly right: Vec2;
  readonly front: Vec2;
}): Result<Ellipse, GeometryError> {
  const [lx, ly] = points.left;
  const [rx, ry] = points.right;
  const width = Math.hypot(rx - lx, ry - ly);
  if (width < 1) return invalid('left and right silhouettes coincide');
  const axis: Vec2 = [(rx - lx) / width, (ry - ly) / width];
  const normal: Vec2 = [-axis[1], axis[0]];
  const centre: Vec2 = [(lx + rx) / 2, (ly + ry) / 2];
  const a = width / 2;
  const dx = points.front[0] - centre[0];
  const dy = points.front[1] - centre[1];
  if (Math.abs(dx * axis[0] + dy * axis[1]) > FRONT_TOLERANCE * a) {
    return invalid('the front point is not on the axis of the ellipse');
  }
  const b = dx * normal[0] + dy * normal[1];
  if (Math.abs(b) >= a) return invalid('the ellipse is taller than it is wide');
  return ok({ centre, a, b, axis, normal, kappa: 0 });
}

export function ellipsePoint(ellipse: Ellipse, theta: number): Vec2 {
  const k = ellipse.kappa;
  const w = 1 - k * Math.cos(theta);
  const along = (ellipse.a * Math.sqrt(1 - k * k) * Math.sin(theta)) / w;
  const across = (ellipse.b * (Math.cos(theta) - k)) / w;
  return [
    ellipse.centre[0] + along * ellipse.axis[0] + across * ellipse.normal[0],
    ellipse.centre[1] + along * ellipse.axis[1] + across * ellipse.normal[1],
  ];
}

/** Depth of the point at θ of a section, up to a common factor, for a physical radius r. */
const depth = (ellipse: Ellipse, radius: number, theta: number) =>
  (radius * (1 - ellipse.kappa * Math.cos(theta))) /
  (ellipse.a * Math.sqrt(1 - ellipse.kappa * ellipse.kappa));

const facingOf = (kappa: number, theta: number) => (Math.cos(theta) - kappa) / (1 - kappa);

function intersect(p: Vec2, d: Vec2, q: Vec2, e: Vec2): Vec2 | null {
  const cross = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(cross) <= 1e-6 * Math.hypot(...d) * Math.hypot(...e)) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / cross;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}

/** Half-width of the profile on the line through `centre` along `axis`, or null outside the profile. */
function profileHalfWidth(profile: readonly Vec2[], centre: Vec2, axis: Vec2): number | null {
  for (let index = 1; index < profile.length; index += 1) {
    const from = profile[index - 1];
    const to = profile[index];
    if (from === undefined || to === undefined) continue;
    const side: Vec2 = [to[0] - from[0], to[1] - from[1]];
    const hit = intersect(centre, axis, from, side);
    if (hit === null) continue;
    const t =
      ((hit[0] - from[0]) * side[0] + (hit[1] - from[1]) * side[1]) /
      (side[0] * side[0] + side[1] * side[1]);
    if (t >= -1e-9 && t <= 1 + 1e-9) {
      return Math.abs((centre[0] - hit[0]) * axis[0] + (centre[1] - hit[1]) * axis[1]);
    }
  }
  return null;
}

/** The section at height s, for a profiled object (bottle): its axis point, half-width and openness. */
function section(frame: RevolutionFrame, s: number): Ellipse {
  const { top, bottom } = frame;
  const wt = (1 - s) * depth(top, frame.radiusRatio, 0);
  const wb = s * depth(bottom, 1, 0);
  const mix = (p: number, q: number) => (wt * p + wb * q) / (wt + wb);
  const centre: Vec2 = [mix(top.centre[0], bottom.centre[0]), mix(top.centre[1], bottom.centre[1])];
  const ax = lerp(top.axis[0], bottom.axis[0], s);
  const ay = lerp(top.axis[1], bottom.axis[1], s);
  const norm = Math.hypot(ax, ay);
  const axis: Vec2 = [ax / norm, ay / norm];
  const fallback = mix(top.a, bottom.a);
  const a =
    frame.profile === null ? fallback : (profileHalfWidth(frame.profile, centre, axis) ?? fallback);
  return {
    centre,
    a,
    b: a * lerp(top.b / top.a, bottom.b / bottom.a, s),
    axis,
    normal: [-axis[1], axis[0]],
    kappa: lerp(top.kappa, bottom.kappa, s),
  };
}

/** κ of an ellipse for a focal length: κ / √(1 − κ²) = (a / f)·cos(view angle). */
function kappaOf(ellipse: Ellipse, focal: number | null): number {
  if (focal === null) return 0;
  const tilt = ellipse.b / ellipse.a;
  const m = (ellipse.a / focal) * Math.sqrt(1 - tilt * tilt);
  return Math.min(MAX_KAPPA, m / Math.sqrt(1 + m * m));
}

/** Validates the two ellipses and derives the frame the logo is laid in. */
export function revolutionFrame(
  geometry: RevolutionGeometry,
): Result<RevolutionFrame, GeometryError> {
  const top = ellipseFrom3(geometry.top);
  if (!top.ok) return invalid(`top: ${top.error.reason}`);
  const bottom = ellipseFrom3(geometry.bottom);
  if (!bottom.ok) return invalid(`bottom: ${bottom.error.reason}`);
  const t = top.value;
  const b = bottom.value;
  const axisLength = Math.hypot(b.centre[0] - t.centre[0], b.centre[1] - t.centre[1]);
  if (axisLength < 1) return invalid('the two ellipses share their centre');
  // The axis subtends the difference of the two view angles: f ≈ axis length / that difference.
  const spread = Math.asin(b.b / b.a) - Math.asin(t.b / t.a);
  const focal = spread > 1e-3 ? axisLength / spread : null;
  const tilt = (Math.abs(t.b) / t.a + Math.abs(b.b) / b.a) / 2;
  const height = axisLength / Math.sqrt(1 - tilt * tilt);
  const vanishing = intersect(
    geometry.top.left,
    [
      geometry.bottom.left[0] - geometry.top.left[0],
      geometry.bottom.left[1] - geometry.top.left[1],
    ],
    geometry.top.right,
    [
      geometry.bottom.right[0] - geometry.top.right[0],
      geometry.bottom.right[1] - geometry.top.right[1],
    ],
  );
  const arc = (geometry.arcDegrees * Math.PI) / 180;
  const band = geometry.band;
  const partial: RevolutionFrame = {
    top: { ...t, kappa: kappaOf(t, focal) },
    bottom: { ...b, kappa: kappaOf(b, focal) },
    radiusRatio: geometry.radiusRatio ?? 1,
    vanishing,
    focal,
    height,
    aspect: 1,
    centreAngle: (geometry.centreDegrees * Math.PI) / 180,
    arc,
    band,
    profile: geometry.profile ?? null,
    edge: Math.sqrt(2 / Math.min(t.a, b.a)),
  };
  const radius = section(partial, (band.from + band.to) / 2).a;
  return ok({ ...partial, aspect: (radius * arc) / (height * (band.to - band.from)) });
}

/** The scene pixel at angle θ and height s, with its facing. */
export function revolutionPoint(frame: RevolutionFrame, theta: number, s: number): SurfacePoint {
  if (frame.profile !== null) {
    const local = section(frame, s);
    const [x, y] = ellipsePoint(local, theta);
    return { x, y, facing: facingOf(local.kappa, theta) };
  }
  // Homogeneous interpolation along the generatrix: image points weighted by their depth.
  const [tx, ty] = ellipsePoint(frame.top, theta);
  const [bx, by] = ellipsePoint(frame.bottom, theta);
  const wt = (1 - s) * depth(frame.top, frame.radiusRatio, theta);
  const wb = s * depth(frame.bottom, 1, theta);
  return {
    x: (wt * tx + wb * bx) / (wt + wb),
    y: (wt * ty + wb * by) / (wt + wb),
    facing: facingOf(lerp(frame.top.kappa, frame.bottom.kappa, s), theta),
  };
}

/** The angle and height of a point (u, v) of the logo box. */
export function logoAngle(frame: RevolutionFrame, u: number, v: number): readonly [number, number] {
  return [frame.centreAngle + (u - 0.5) * frame.arc, lerp(frame.band.from, frame.band.to, v)];
}
