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
const EDGE_DELTA = 0.05;
const EDGE_FALLBACK_SHARE = 0.01;

export function isRetained(image: DecodedImage, pixel: number): boolean {
  return (image.data[pixel * 4 + 3] ?? 0) >= MIN_ALPHA;
}

function borderPixels(image: DecodedImage): Set<number> {
  const { width, height } = image;
  const border = new Set<number>();
  for (let x = 0; x < width; x += 1) {
    border.add(x);
    border.add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    border.add(y * width);
    border.add(y * width + width - 1);
  }
  return border;
}

// Step 2: a uniform opaque background is removed when it frames the logo and covers ≥ 30 % of it.
function backgroundPixels(
  image: DecodedImage,
  retained: readonly number[],
  labs: LabCache,
): number[] {
  const whole = borderPixels(image);
  const border = [...whole].filter((pixel) => isRetained(image, pixel));
  if (border.length === 0) return [];
  const counts = new Map<number, number>();
  for (const pixel of border) {
    const key = colorKeyAt(image.data, pixel);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Most frequent border colour; ties broken by ascending hex, i.e. ascending 24-bit key.
  let dominant = 0;
  let dominantCount = -1;
  for (const [key, count] of counts) {
    if (count > dominantCount || (count === dominantCount && key < dominant)) {
      dominant = key;
      dominantCount = count;
    }
  }
  const reference = labs.lab(dominant);
  const near = (pixel: number): boolean =>
    distanceOk(labs.lab(colorKeyAt(image.data, pixel)), reference) < BACKGROUND_DELTA;
  if (border.filter(near).length < BACKGROUND_BORDER_SHARE * whole.size) return [];
  const background = retained.filter(near);
  return background.length >= BACKGROUND_MIN_SHARE * retained.length ? background : [];
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

/** Pixels that steps 1 to 3 keep for the histogram. */
export function selectPixels(image: DecodedImage, labs: LabCache): number[] {
  const retained: number[] = [];
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    if (isRetained(image, pixel)) retained.push(pixel);
  }
  const background = new Set(backgroundPixels(image, retained, labs));
  const foreground = retained.filter((pixel) => !background.has(pixel));
  const edges = new Set(edgePixels(image, foreground, labs));
  const interior = foreground.filter((pixel) => !edges.has(pixel));
  // Fallback for very thin strokes: excluding edges would leave almost nothing.
  return interior.length < EDGE_FALLBACK_SHARE * foreground.length ? foreground : interior;
}
