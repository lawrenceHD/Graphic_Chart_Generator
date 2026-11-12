import type { PsdLayer, PsdScene } from '@app/contracts';
import { mappingAspect, surfaceMapping, tessellate, type UvMesh } from '@app/mockup-engine';
import { err, ok, type Result } from '@app/kernel';

// Slots of a Photoshop mockup whose UV map is computed from a geometry rather than baked (ADR-034), a
// flat quad included: the mug is a true cylinder, the logo squeezed towards its edges and cut at the
// silhouette. Meshed once per scene; the GPU draws the map once per mesh.

export interface ComputedSlot {
  readonly mesh: UvMesh;
  /** Width over height of the logo box on the object, from its geometry. */
  readonly aspect: number;
}

type SlotLayer = Extract<PsdLayer, { readonly type: 'slot' }>;

export function computedSlots(scene: PsdScene): Result<ReadonlyMap<string, ComputedSlot>, string> {
  const slots = new Map<string, ComputedSlot>();
  for (const layer of scene.layers) {
    if (layer.type !== 'slot' || layer.geometry === undefined) continue;
    const mapping = surfaceMapping(layer.geometry);
    if (!mapping.ok) return err(`${layer.id}: ${mapping.error.reason}`);
    slots.set(layer.id, {
      mesh: tessellate(mapping.value),
      aspect: mappingAspect(mapping.value) ?? layer.aspect,
    });
  }
  return ok(slots);
}

/** The proportions the slot's artwork is drawn at. */
export function slotAspect(layer: SlotLayer, slots: ReadonlyMap<string, ComputedSlot>): number {
  return slots.get(layer.id)?.aspect ?? layer.aspect;
}
