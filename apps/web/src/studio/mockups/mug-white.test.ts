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
    expect(slot?.mesh.indices.length).toBeGreaterThan(0);
    const facings: number[] = [];
    slot?.mesh.attributes.forEach((value, index) => {
      if (index % 3 === 2) facings.push(value);
    });
    // The box wraps far enough round the mug for its edges to fall towards the silhouette.
    expect(Math.min(...facings)).toBeLessThan(0.6);
  });
});
