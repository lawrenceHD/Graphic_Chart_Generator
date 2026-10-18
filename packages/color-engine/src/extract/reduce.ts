import { hexToOklch } from '../oklab.js';
import type { Oklab } from '../types.js';
import type { RawCluster } from './cluster.js';
import { distanceOk } from './lab-cache.js';
import type { PaletteCluster } from './types.js';

interface Working {
  readonly center: string;
  readonly centerLab: Oklab;
  population: number;
}

const compareHex = (first: string, second: string): number =>
  first < second ? -1 : first > second ? 1 : 0;

// Smallest population first; ties: descending centre hex (§2.4 step 7a).
function smallest(clusters: readonly Working[]): Working | undefined {
  return [...clusters].sort(
    (first, second) =>
      first.population - second.population || compareHex(second.center, first.center),
  )[0];
}

// Nearest remaining centre; ties: ascending centre hex.
function nearest(clusters: readonly Working[], source: Working): Working | undefined {
  return clusters
    .filter((cluster) => cluster !== source)
    .map((cluster) => ({ cluster, distance: distanceOk(cluster.centerLab, source.centerLab) }))
    .sort(
      (first, second) =>
        first.distance - second.distance || compareHex(first.cluster.center, second.cluster.center),
    )[0]?.cluster;
}

// A merge adds populations; the host keeps its own centre, so no colour is ever averaged.
function mergeSmallest(clusters: Working[]): boolean {
  const source = smallest(clusters);
  const host = source ? nearest(clusters, source) : undefined;
  if (!source || !host) return false;
  host.population += source.population;
  clusters.splice(clusters.indexOf(source), 1);
  return true;
}

/** Step 7 then step 8: shares sum to 1 because no population is ever dropped. */
export function reduceClusters(
  raw: readonly RawCluster[],
  minShare: number,
  maxClusters: number,
): PaletteCluster[] {
  const clusters: Working[] = raw.map((cluster) => ({
    center: cluster.center,
    centerLab: cluster.centerLab,
    population: cluster.population,
  }));
  const total = clusters.reduce((sum, cluster) => sum + cluster.population, 0);
  const tooSmall = (): boolean => clusters.some((cluster) => cluster.population / total < minShare);

  while (clusters.length >= 3 && tooSmall() && mergeSmallest(clusters));
  while (clusters.length > maxClusters && mergeSmallest(clusters));

  return clusters
    .map((cluster) => ({
      hex: cluster.center,
      share: cluster.population / total,
      oklab: cluster.centerLab,
      oklch: hexToOklch(cluster.center),
    }))
    .sort((first, second) => second.share - first.share || compareHex(first.hex, second.hex));
}
