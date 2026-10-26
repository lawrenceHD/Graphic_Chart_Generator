import { SceneDefinition } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { computeHomography, type Homography } from './homography.js';

export type SceneError = { readonly code: 'SCENE_INVALID'; readonly issues: readonly string[] };
export type LoadedScene = {
  readonly scene: SceneDefinition;
  /** Unit square → quad, per surface id. */
  readonly homographies: ReadonlyMap<string, Homography>;
};

/** Validates a scene.json (shape with Zod, then quad geometry); an invalid scene is refused. */
export function parseScene(input: unknown): Result<LoadedScene, SceneError> {
  const parsed = SceneDefinition.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'SCENE_INVALID',
      issues: parsed.error.issues.map((issue) => issue.path.map(String).join('.')),
    });
  }
  const homographies = new Map<string, Homography>();
  const issues: string[] = [];
  parsed.data.surfaces.forEach((surface, index) => {
    const h = computeHomography(surface.quad);
    if (h.ok) homographies.set(surface.id, h.value);
    else issues.push(`surfaces.${String(index)}.quad: ${h.error.reason}`);
  });
  if (issues.length > 0) return err({ code: 'SCENE_INVALID', issues });
  return ok({ scene: parsed.data, homographies });
}
