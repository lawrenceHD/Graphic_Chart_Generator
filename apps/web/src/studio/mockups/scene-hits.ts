import type { PsdScene, SceneDefinition } from '@app/contracts';
import {
  boundsOf,
  photoObjects,
  pointInPolygon,
  psdObjects,
  type MockupObject,
  type Point,
} from './objects';

// What a click on a mockup picture means: which object lies under the pointer. Masks are read once per
// scene from the files the compositor already loads; a photographed surface without a mask is its quad.
export interface SceneHits {
  readonly objects: readonly MockupObject[];
  readonly hits: readonly {
    readonly id: string;
    readonly hit: (x: number, y: number) => boolean;
  }[];
}

interface Mask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** The red channel of an image, which is the grey level of a one-channel mask. */
export function maskOf(image: HTMLImageElement): Mask | null {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) return null;
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let index = 0; index < data.length; index += 1) data[index] = rgba[index * 4] ?? 0;
  return { width: canvas.width, height: canvas.height, data };
}

const maskHit =
  (mask: Mask) =>
  (x: number, y: number): boolean => {
    const column = Math.floor(x);
    const row = Math.floor(y);
    if (column < 0 || row < 0 || column >= mask.width || row >= mask.height) return false;
    return (mask.data[row * mask.width + column] ?? 0) > 127;
  };

export async function photoHits(
  scene: SceneDefinition,
  loadMask: (file: string) => Promise<Mask | null>,
): Promise<SceneHits> {
  const objects: MockupObject[] = [];
  const hits: { id: string; hit: (x: number, y: number) => boolean }[] = [];
  for (const [index, object] of photoObjects(scene).entries()) {
    const surface = scene.surfaces[index];
    const mask = surface?.mask === undefined ? null : await loadMask(surface.mask);
    const quad: readonly Point[] = object.outline ?? [];
    objects.push({ ...object, outline: mask === null ? quad : (boundsOf(mask) ?? quad) });
    hits.push({
      id: object.id,
      hit: mask === null ? (x, y) => pointInPolygon(x, y, quad) : maskHit(mask),
    });
  }
  return { objects, hits };
}

export async function psdHits(
  scene: PsdScene,
  loadMask: (file: string) => Promise<Mask | null>,
): Promise<SceneHits> {
  const objects: MockupObject[] = [];
  const hits: { id: string; hit: (x: number, y: number) => boolean }[] = [];
  const fields = scene.layers.flatMap((layer) => (layer.type === 'paint' ? [layer] : []));
  for (const [index, object] of psdObjects(scene).entries()) {
    const file = fields[index]?.mask;
    const mask = file === undefined ? null : await loadMask(file);
    if (mask === null) continue;
    objects.push({ ...object, outline: boundsOf(mask) });
    hits.push({ id: object.id, hit: maskHit(mask) });
  }
  return { objects, hits };
}

// The inspector lives beside the canvas, not under it: it reads the objects the stage found from here,
// and is told when they change (`useSyncExternalStore`), since the masks are measured after it renders.
const NONE: readonly MockupObject[] = [];
const known = new Map<string, readonly MockupObject[]>();
const listeners = new Set<() => void>();
export const rememberObjects = (scene: string, objects: readonly MockupObject[]): void => {
  known.set(scene, objects);
  for (const listener of listeners) listener();
};
export const objectsOfScene = (scene: string): readonly MockupObject[] => known.get(scene) ?? NONE;
export const subscribeObjects = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
