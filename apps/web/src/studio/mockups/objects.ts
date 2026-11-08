import type { MockupFinish, PsdScene, SceneDefinition } from '@app/contracts';
import type { LogoVersion } from '@app/mockup-engine';

// The objects of a mockup scene the person can select and adjust: the surfaces of a photographed scene,
// the colour fields of a Photoshop scene. Pure: the stage draws, this says what each object allows.
export type PaintRole = 'primary' | 'accent' | 'neutralLight' | 'neutralDark';
export const PAINT_ROLES: readonly PaintRole[] = [
  'primary',
  'accent',
  'neutralLight',
  'neutralDark',
];

export type Point = readonly [number, number];

export interface MockupObject {
  readonly id: string;
  /** A surface of a photographed scene, or a colour field of a Photoshop scene. */
  readonly kind: 'surface' | 'paint';
  /** Palette colours the object can be printed on (empty: its colour is not adjustable). */
  readonly paints: readonly PaintRole[];
  /** The object may also keep the photograph's own stock colour. */
  readonly original: boolean;
  readonly finishes: readonly MockupFinish[];
  /** Outline in scene pixels; null until measured from the mask (Photoshop scenes). */
  readonly outline: readonly Point[] | null;
}

export function photoObjects(scene: SceneDefinition): readonly MockupObject[] {
  return scene.surfaces.map((surface) => ({
    id: surface.id,
    kind: 'surface',
    paints: surface.paint?.some((choice) => choice !== 'none') === true ? PAINT_ROLES : [],
    original: surface.paint?.includes('none') ?? true,
    finishes: surface.finishes,
    outline: surface.quad,
  }));
}

export function psdObjects(scene: PsdScene): readonly MockupObject[] {
  const objects: MockupObject[] = [];
  for (const layer of scene.layers) {
    if (layer.type !== 'paint') continue;
    objects.push({
      id: `field-${String(objects.length)}`,
      kind: 'paint',
      paints: PAINT_ROLES,
      original: false,
      finishes: [],
      outline: null,
    });
  }
  return objects;
}

/** Logo versions that exist for the brand; the colour logo is always there. */
export function availableLogos(files: {
  readonly 'mono-black': string | null;
  readonly 'mono-white': string | null;
}): readonly LogoVersion[] {
  return [
    'color',
    ...(files['mono-black'] === null ? [] : (['black'] as const)),
    ...(files['mono-white'] === null ? [] : (['white'] as const)),
  ];
}

export function pointInPolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] ?? [0, 0];
    const [xj, yj] = polygon[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Id of the topmost object under a point (later objects are drawn above earlier ones), or null. */
export function pickObject(
  objects: readonly { readonly id: string; readonly hit: (x: number, y: number) => boolean }[],
  x: number,
  y: number,
): string | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const candidate = objects[index];
    if (candidate?.hit(x, y) === true) return candidate.id;
  }
  return null;
}

/** Bounding box of the lit pixels of a one-channel mask, as four corners; null for an empty mask. */
export function boundsOf(mask: {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}): readonly Point[] | null {
  let left = mask.width;
  let top = mask.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if ((mask.data[y * mask.width + x] ?? 0) <= 127) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return null;
  return [
    [left, top],
    [right + 1, top],
    [right + 1, bottom + 1],
    [left, bottom + 1],
  ];
}

/** `brand-scene.png`, ASCII only, for the downloaded picture. */
export function exportFileName(brand: string, scene: string): string {
  const slug = brand
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return `${slug === '' ? 'charta' : slug}-${scene}.png`;
}
