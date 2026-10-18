import { colorKeyAt, distanceOk, type LabCache } from './lab-cache.js';
import type { DecodedImage } from './types.js';

// 05_ENGINES.md §2.4, steps 1 to 3; step 2 as amended by decisions A and D (journal/OWNER_DECISIONS.md).
const MIN_ALPHA = 230;
// Share of the WHOLE border, transparent pixels included (D): a transparent logo touching the edges has
// only logo colour among its opaque border pixels, which is not a background. 0.75 leaves room for a
// tightly cropped logo touching two edges.
const BACKGROUND_BORDER_SHARE = 0.75;
const BACKGROUND_MIN_SHARE = 0.3;
// Tolerant enough for JPEG noise around a flat background (A), well under mergeThreshold.
const BACKGROUND_DELTA = 0.03;
// JPEG halos (decision A): near-background tints around the shapes, removed only when connected to the
// background. A light grey drawn on purpose (#E0E0E0 is 0.093 from white) stays.
const HALO_DELTA = 0.06;
const EDGE_DELTA = 0.05;
const EDGE_FALLBACK_SHARE = 0.01;

export function isRetained(image: DecodedImage, pixel: number): boolean {
  return (image.data[pixel * 4 + 3] ?? 0) >= MIN_ALPHA;
}

// Pixels at exactly `inset` pixels from the nearest image edge (inset 0: the border itself).
function ringPixels(image: DecodedImage, inset: number): number[] {
  const { width, height } = image;
  const right = width - 1 - inset;
  const bottom = height - 1 - inset;
  if (right < inset || bottom < inset) return [];
  const ring = new Set<number>();
  for (let x = inset; x <= right; x += 1) {
    ring.add(inset * width + x);
    ring.add(bottom * width + x);
  }
  for (let y = inset; y <= bottom; y += 1) {
    ring.add(y * width + inset);
    ring.add(y * width + right);
  }
  return [...ring];
}

// Thin presentation frames (a 1-4 px line around a Pinterest or Behance export) hide the background from
// the outermost ring: inner rings are tried in turn, only while the band outside them looks like a frame
// line, opaque and of one colour (≥ 90 % within FRAME_DELTA of its most frequent colour). A transparent
// logo touching the edges, or a rounded tile cropped tight (white corners, dark sides), is no frame.
// The band goes with the background.
const FRAME_INSETS = [0, 1, 2, 3, 4];
const FRAME_DELTA = 0.1;
const FRAME_UNIFORM_SHARE = 0.9;

// Step 2: a uniform opaque background is removed when it frames the logo and covers ≥ 30 % of it.
interface Background {
  readonly pixels: readonly number[];
  /** 24-bit key of the most frequent border colour, the removed background's colour. */
  readonly key: number;
}

function backgroundPixels(
  image: DecodedImage,
  retained: readonly number[],
  labs: LabCache,
): Background | null {
  const band: number[] = [];
  for (const inset of FRAME_INSETS) {
    if (!isFrame(image, band, labs)) return null;
    const ring = ringPixels(image, inset);
    const found = uniformBackground(image, ring, retained, labs);
    if (found !== null) {
      const frame = new Set(band);
      const pixels = [...frame, ...found.pixels.filter((pixel) => !frame.has(pixel))];
      return { pixels, key: found.key };
    }
    band.push(...ring);
  }
  return null;
}

function mostFrequentKey(image: DecodedImage, pixels: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const pixel of pixels) {
    const key = colorKeyAt(image.data, pixel);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Ties broken by ascending hex, i.e. ascending 24-bit key.
  let dominant = 0;
  let dominantCount = -1;
  for (const [key, count] of counts) {
    if (count > dominantCount || (count === dominantCount && key < dominant)) {
      dominant = key;
      dominantCount = count;
    }
  }
  return dominant;
}

function isFrame(image: DecodedImage, band: readonly number[], labs: LabCache): boolean {
  if (band.length === 0) return true;
  if (band.some((pixel) => !isRetained(image, pixel))) return false;
  const reference = labs.lab(mostFrequentKey(image, band));
  const close = band.filter(
    (pixel) => distanceOk(labs.lab(colorKeyAt(image.data, pixel)), reference) < FRAME_DELTA,
  );
  return close.length >= FRAME_UNIFORM_SHARE * band.length;
}

function uniformBackground(
  image: DecodedImage,
  whole: readonly number[],
  retained: readonly number[],
  labs: LabCache,
): Background | null {
  const border = whole.filter((pixel) => isRetained(image, pixel));
  if (border.length === 0) return null;
  const dominant = mostFrequentKey(image, border);
  const reference = labs.lab(dominant);
  const near = (pixel: number): boolean =>
    distanceOk(labs.lab(colorKeyAt(image.data, pixel)), reference) < BACKGROUND_DELTA;
  if (border.filter(near).length < BACKGROUND_BORDER_SHARE * whole.length) return null;
  const background = retained.filter(near);
  return background.length >= BACKGROUND_MIN_SHARE * retained.length
    ? {
        pixels: withHalo(
          image,
          background,
          (pixel) => distanceOk(labs.lab(colorKeyAt(image.data, pixel)), reference) < HALO_DELTA,
        ),
        key: dominant,
      }
    : null;
}

// Grows the background, 4-connected, through retained pixels close enough to it to be compression halo.
function withHalo(
  image: DecodedImage,
  background: readonly number[],
  isHalo: (pixel: number) => boolean,
): number[] {
  const { width, height } = image;
  const reached = new Uint8Array(width * height);
  for (const pixel of background) reached[pixel] = 1;
  const queue = [...background];
  for (let index = 0; index < queue.length; index += 1) {
    const pixel = queue[index] ?? 0;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const neighbours = [
      y > 0 ? pixel - width : -1,
      y < height - 1 ? pixel + width : -1,
      x > 0 ? pixel - 1 : -1,
      x < width - 1 ? pixel + 1 : -1,
    ];
    for (const neighbour of neighbours) {
      if (neighbour < 0 || reached[neighbour] === 1 || !isRetained(image, neighbour)) continue;
      if (!isHalo(neighbour)) continue;
      reached[neighbour] = 1;
      queue.push(neighbour);
    }
  }
  return queue;
}

// Step 3: blended edge pixels differ from a neighbour. Neighbours are the pixels retained at step 1,
// background included, since blends sit between the logo and its background.
function edgePixels(image: DecodedImage, candidates: readonly number[], labs: LabCache): number[] {
  const { width, height } = image;
  return candidates.filter((pixel) => {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const own = labs.lab(colorKeyAt(image.data, pixel));
    const neighbours = [
      y > 0 ? pixel - width : -1,
      y < height - 1 ? pixel + width : -1,
      x > 0 ? pixel - 1 : -1,
      x < width - 1 ? pixel + 1 : -1,
    ];
    return neighbours.some(
      (neighbour) =>
        neighbour >= 0 &&
        isRetained(image, neighbour) &&
        distanceOk(labs.lab(colorKeyAt(image.data, neighbour)), own) > EDGE_DELTA,
    );
  });
}

export interface Selection {
  /** Pixels that steps 1 to 3 keep for the histogram. */
  readonly pixels: number[];
  /** Background removed at step 2 (decision B reports it), with its share of the retained pixels. */
  readonly background: { readonly key: number; readonly share: number } | null;
}

export function selectPixels(image: DecodedImage, labs: LabCache): Selection {
  const retained: number[] = [];
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    if (isRetained(image, pixel)) retained.push(pixel);
  }
  const removed = backgroundPixels(image, retained, labs);
  const background = new Set(removed?.pixels);
  const foreground = retained.filter((pixel) => !background.has(pixel));
  const edges = new Set(edgePixels(image, foreground, labs));
  const interior = foreground.filter((pixel) => !edges.has(pixel));
  // Fallback for very thin strokes: excluding edges would leave almost nothing.
  return {
    pixels: interior.length < EDGE_FALLBACK_SHARE * foreground.length ? foreground : interior,
    background: removed && {
      key: removed.key,
      share: removed.pixels.length / retained.length,
    },
  };
}
