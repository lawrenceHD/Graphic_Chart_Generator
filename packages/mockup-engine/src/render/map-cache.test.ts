import { describe, expect, it } from 'vitest';
import type { UvMesh } from '../geometry/uv-map.js';
import { createMapCache } from './map-cache.js';

const mesh = (): UvMesh => ({
  positions: new Float32Array(0),
  attributes: new Float32Array(0),
  indices: new Uint32Array(0),
  edge: 0,
});

describe('map cache of UV_PASS (per mesh and size)', () => {
  it('finds a map drawn for the same mesh at the same size only', () => {
    const cache = createMapCache<string>();
    const m = mesh();
    expect(cache.set(m, 2400, 1594, 'full')).toBeUndefined();
    expect(cache.get(m, 2400, 1594)).toBe('full');
    expect(cache.get(m, 1200, 797)).toBeUndefined();
    expect(cache.get(mesh(), 2400, 1594)).toBeUndefined();
  });

  it('hands back the map it replaces when the size changes, to be freed', () => {
    const cache = createMapCache<string>();
    const m = mesh();
    cache.set(m, 2400, 1594, 'full');
    expect(cache.set(m, 1200, 797, 'half')).toBe('full');
    expect(cache.get(m, 2400, 1594)).toBeUndefined();
    expect(cache.get(m, 1200, 797)).toBe('half');
  });

  it('forgets everything when the context is lost', () => {
    const cache = createMapCache<string>();
    const a = mesh();
    const b = mesh();
    cache.set(a, 10, 10, 'a');
    cache.set(b, 10, 10, 'b');
    expect(cache.clear()).toEqual(['a', 'b']);
    expect(cache.get(a, 10, 10)).toBeUndefined();
  });
});
