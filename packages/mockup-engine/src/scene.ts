import { SceneDefinition, type SurfaceGeometry } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { revolutionFrame, type GeometryError } from './geometry/revolution.js';
import type { CurvedMapping } from './geometry/uv-map.js';
import { computeHomography, type Homography } from './homography.js';

export type SceneError = { readonly code: 'SCENE_INVALID'; readonly issues: readonly string[] };

/** How a surface's unit square reaches the picture: a homography, or a computed surface (ADR-034). */
export type SurfaceMapping =
  { readonly kind: 'homography'; readonly h: Homography } | CurvedMapping;

export type LoadedScene = {
  readonly scene: SceneDefinition;
  /** Unit square → quad, per surface id (the quad stays the hit region of a curved surface). */
  readonly homographies: ReadonlyMap<string, Homography>;
  /** The mapping the logo follows, per surface id. */
  readonly mappings: ReadonlyMap<string, SurfaceMapping>;
};

/** The mapping of a geometry, its maths checked (front point on the axis, convex quad). */
export function surfaceMapping(geometry: SurfaceGeometry): Result<SurfaceMapping, GeometryError> {
  if (geometry.kind === 'quad') {
    const h = computeHomography(geometry.quad);
    return h.ok
      ? ok({ kind: 'homography', h: h.value })
      : err({ code: 'GEOMETRY_INVALID', reason: h.error.reason });
  }
  if (geometry.kind === 'mesh') {
    return ok({ kind: 'mesh', grid: geometry });
  }
  const frame = revolutionFrame(geometry);
  return frame.ok ? ok({ kind: 'revolution', frame: frame.value }) : frame;
}

/** Width over height of the logo box a computed surface implies; null where the scene declares it. */
export function mappingAspect(mapping: SurfaceMapping): number | null {
  return mapping.kind === 'revolution' ? mapping.frame.aspect : null;
}

/** Validates a scene.json (shape with Zod, then geometry); an invalid scene is refused. */
export function parseScene(input: unknown): Result<LoadedScene, SceneError> {
  const parsed = SceneDefinition.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'SCENE_INVALID',
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`,
      ),
    });
  }
  const homographies = new Map<string, Homography>();
  const mappings = new Map<string, SurfaceMapping>();
  const issues: string[] = [];
  parsed.data.surfaces.forEach((surface, index) => {
    const h = computeHomography(surface.quad);
    if (h.ok) homographies.set(surface.id, h.value);
    else issues.push(`surfaces.${String(index)}.quad: ${h.error.reason}`);
    if (surface.geometry === undefined) {
      if (h.ok) mappings.set(surface.id, { kind: 'homography', h: h.value });
      return;
    }
    const mapping = surfaceMapping(surface.geometry);
    if (mapping.ok) mappings.set(surface.id, mapping.value);
    else issues.push(`surfaces.${String(index)}.geometry: ${mapping.error.reason}`);
  });
  if (issues.length > 0) return err({ code: 'SCENE_INVALID', issues });
  return ok({ scene: parsed.data, homographies, mappings });
}
