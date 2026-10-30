import { describe, expect, it } from 'vitest';
import { createVtracer } from './vectorizer.js';

describe('createVtracer — the Vectorizer of the worker (vtracer, 05_ENGINES.md §5 T-011)', () => {
  it('traces a ring as one outline with its hole, offset to where the ink is', async () => {
    const width = 64;
    const height = 48;
    const data = new Uint8Array(width * height);
    for (let y = 8; y < 40; y += 1)
      for (let x = 16; x < 48; x += 1)
        if (!(x >= 26 && x < 38 && y >= 18 && y < 30)) data[y * width + x] = 1;

    const traced = await createVtracer().trace({ width, height, data });
    if (!traced.ok) throw new Error(traced.error.reason);

    expect(traced.value).toHaveLength(1);
    const [ring] = traced.value;
    expect(ring?.dx).toBeCloseTo(16, 0);
    expect(ring?.dy).toBeCloseTo(8, 0);
    // Outer outline and the hole: two subpaths.
    expect(ring?.d.match(/M/g)).toHaveLength(2);
  });

  it('returns no outline for an empty mask', async () => {
    const traced = await createVtracer().trace({ width: 8, height: 8, data: new Uint8Array(64) });

    expect(traced.ok && traced.value).toEqual([]);
  });
});
