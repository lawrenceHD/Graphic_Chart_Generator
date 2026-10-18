import { colorKeyAt, distanceOk, hexOfKey, LabCache } from './lab-cache.js';
import { isRetained } from './pixels.js';
import type { Oklab } from '../types.js';
import type { DecodedImage } from './types.js';

export interface ColorCount {
  readonly hex: string;
  readonly count: number;
  readonly oklab: Oklab;
}

export interface RawCluster {
  /** The heaviest colour of the cluster, never an average (§2.4 step 6). */
  readonly center: string;
  readonly centerLab: Oklab;
  readonly population: number;
  readonly members: readonly ColorCount[];
}

function byPopulationThenHex(first: ColorCount, second: ColorCount): number {
  return (
    second.count - first.count || (first.hex < second.hex ? -1 : first.hex > second.hex ? 1 : 0)
  );
}

/** Steps 4 and 5: exact histogram of the given pixels, by decreasing population then ascending hex. */
export function histogramOf(
  image: DecodedImage,
  pixels: readonly number[],
  labs = new LabCache(),
): ColorCount[] {
  const counts = new Map<number, number>();
  for (const pixel of pixels) {
    const key = colorKeyAt(image.data, pixel);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, count]) => ({ hex: hexOfKey(key), count, oklab: labs.lab(key) }))
    .sort(byPopulationThenHex);
}

/** Histogram of every pixel retained at step 1 except `excluded` (test and diagnostic entry point). */
export function histogram(image: DecodedImage, excluded: ReadonlySet<number>): ColorCount[] {
  const pixels: number[] = [];
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    if (isRetained(image, pixel) && !excluded.has(pixel)) pixels.push(pixel);
  }
  return histogramOf(image, pixels);
}

/** Step 6: greedy merge into the nearest existing centre closer than `threshold` (ties: oldest). */
export function clusterColors(colors: readonly ColorCount[], threshold: number): RawCluster[] {
  const clusters: { center: ColorCount; population: number; members: ColorCount[] }[] = [];
  for (const color of colors) {
    let target: (typeof clusters)[number] | undefined;
    let best = threshold;
    for (const cluster of clusters) {
      const distance = distanceOk(cluster.center.oklab, color.oklab);
      if (distance < best) {
        best = distance;
        target = cluster;
      }
    }
    if (target) {
      target.population += color.count;
      target.members.push(color);
    } else {
      clusters.push({ center: color, population: color.count, members: [color] });
    }
  }
  return clusters.map((cluster) => ({
    center: cluster.center.hex,
    centerLab: cluster.center.oklab,
    population: cluster.population,
    members: cluster.members,
  }));
}
