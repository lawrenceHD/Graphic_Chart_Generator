import type { UvMesh } from '../geometry/uv-map.js';

// The maps UV_PASS draws, kept per mesh at one size: a stage drawn at another size gets a new map (the
// old one is handed back to be freed), and a lost context forgets them all.

export interface MapCache<T> {
  get(mesh: UvMesh, width: number, height: number): T | undefined;
  /** Stores a map; returns the one it replaces for this mesh (drawn at another size), if any. */
  set(mesh: UvMesh, width: number, height: number, value: T): T | undefined;
  /** Forgets every map and returns them, to be freed. */
  clear(): readonly T[];
}

export function createMapCache<T>(): MapCache<T> {
  const entries = new Map<
    UvMesh,
    { readonly width: number; readonly height: number; readonly value: T }
  >();
  return {
    get(mesh, width, height) {
      const entry = entries.get(mesh);
      return entry !== undefined && entry.width === width && entry.height === height
        ? entry.value
        : undefined;
    },
    set(mesh, width, height, value) {
      const previous = entries.get(mesh);
      entries.set(mesh, { width, height, value });
      return previous === undefined || (previous.width === width && previous.height === height)
        ? undefined
        : previous.value;
    },
    clear() {
      const values = [...entries.values()].map((entry) => entry.value);
      entries.clear();
      return values;
    },
  };
}
