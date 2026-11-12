import { PsdSceneSchema } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { computedSlots, slotAspect } from './curved-slots';

// ADR-034: a PSD slot with a geometry gets its UV map computed; the logo box aspect follows the object.

const scene = (slot: Record<string, unknown>) =>
  PsdSceneSchema.parse({
    id: 'mug',
    kind: 'psd',
    schemaVersion: 3,
    size: { width: 600, height: 600 },
    layers: [
      { type: 'image', src: 'base.webp', blend: 'normal', opacity: 1 },
      {
        type: 'slot',
        id: 'slot-1',
        role: 'mug-logo',
        aspect: 1,
        blend: 'normal',
        opacity: 1,
        ...slot,
      },
    ],
  });

const cylinder = (front: readonly [number, number]) => ({
  kind: 'revolution',
  top: { left: [100, 100], right: [500, 100], front },
  bottom: { left: [100, 500], right: [500, 500], front: [300, 540] },
  band: { from: 0, to: 1 },
  arcDegrees: 90,
});

describe('computedSlots', () => {
  it('meshes every slot that carries a geometry, with the aspect of the object', () => {
    const slots = computedSlots(scene({ geometry: cylinder([300, 140]) }));
    expect(slots.ok).toBe(true);
    if (!slots.ok) return;
    const slot = slots.value.get('slot-1');
    expect(slot?.mesh.indices.length).toBeGreaterThan(0);
    expect(slot?.aspect).toBeCloseTo((200 * (Math.PI / 2)) / (400 / Math.sqrt(1 - 0.04)), 6);
  });

  it('meshes a flat quad slot too, at its declared aspect', () => {
    const quad = {
      kind: 'quad',
      quad: [
        [100, 100],
        [500, 120],
        [480, 400],
        [120, 380],
      ],
    };
    const slots = computedSlots(scene({ geometry: quad }));
    expect(slots.ok).toBe(true);
    if (!slots.ok) return;
    expect(slots.value.get('slot-1')?.mesh.indices.length).toBeGreaterThan(0);
    expect(slots.value.get('slot-1')?.aspect).toBe(1);
  });

  it('leaves baked slots to their maps', () => {
    const slots = computedSlots(scene({ uv: 'uv-slot-1.png', vv: 'vv-slot-1.png' }));
    expect(slots.ok && slots.value.size).toBe(0);
  });

  it('refuses a scene whose geometry does not hold, naming the slot', () => {
    const slots = computedSlots(scene({ geometry: cylinder([420, 140]) }));
    expect(slots.ok).toBe(false);
    if (slots.ok) return;
    expect(slots.error).toMatch(/^slot-1: top: /);
  });

  it('draws the artwork at the computed aspect, the declared one otherwise', () => {
    const parsed = scene({ geometry: cylinder([300, 140]) });
    const slots = computedSlots(parsed);
    if (!slots.ok) throw new Error(slots.error);
    const layer = parsed.layers[1];
    if (layer?.type !== 'slot') throw new Error('slot');
    expect(slotAspect(layer, slots.value)).toBe(slots.value.get('slot-1')?.aspect);
    expect(slotAspect({ ...layer, id: 'other' }, slots.value)).toBe(1);
  });
});
