import { PsdSceneSchema } from '@app/contracts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computedSlots } from './curved-slots';

// C-10 (ADR-034): the Firmbee mug replayed with a computed cylinder instead of its nearly flat baked map.

describe('mug-white (C-10)', () => {
  it('is a true cylinder: its slot is computed, the logo squeezed to the edges and cut behind', () => {
    const json: unknown = JSON.parse(
      readFileSync(join(process.cwd(), 'public/scenes/mug-white/scene.json'), 'utf8'),
    );
    const parsed = PsdSceneSchema.parse(json);
    const slots = computedSlots(parsed);
    if (!slots.ok) throw new Error(slots.error);
    const slot = slots.value.get('slot-1');
    if (slot === undefined) throw new Error('slot-1 is not computed');
    const { indices, attributes } = slot.mesh;
    expect(indices.length).toBeGreaterThan(0);
    // Every triangle kept faces the viewer: nothing is drawn on the hidden side.
    for (let t = 0; t < indices.length; t += 3) {
      const facing = Math.max(
        ...[0, 1, 2].map((k) => attributes[(indices[t + k] ?? 0) * 3 + 2] ?? 0),
      );
      expect(facing).toBeGreaterThan(0);
    }
    // The 240 degree box wraps past the silhouettes: both ends of it are left out, cut behind the mug.
    const us = Array.from(indices, (vertex) => attributes[vertex * 3] ?? 0);
    expect(Math.min(...us)).toBeGreaterThan(0.1);
    expect(Math.max(...us)).toBeLessThan(0.9);
    // And the logo box keeps the proportions of the band laid on the cylinder.
    expect(slot.aspect).toBeCloseTo(4.01, 2);
  });
});
