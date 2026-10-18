import { hexToOklch } from '../oklab.js';
import type { Oklab } from '../types.js';
import type { RawCluster } from './cluster.js';
import { distanceOk } from './lab-cache.js';
import type { PaletteCluster } from './types.js';

interface Working {
  center: string;
  centerLab: Oklab;
  /** Pixels of the centre colour alone: the centre is the heaviest single colour of the cluster. */
  centerCount: number;
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

// A merge adds populations. Decision C (journal/OWNER_DECISIONS.md): the centre is then the heaviest single
// colour of the merged cluster (ties: ascending hex), so a flat colour merged into a cluster of many light
// variations keeps its place. Still a real colour of the image, never an average.
function mergeSmallest(clusters: Working[]): boolean {
  const source = smallest(clusters);
  const host = source ? nearest(clusters, source) : undefined;
  if (!source || !host) return false;
  host.population += source.population;
  if (
    source.centerCount > host.centerCount ||
    (source.centerCount === host.centerCount && compareHex(source.center, host.center) < 0)
  ) {
    host.center = source.center;
    host.centerLab = source.centerLab;
    host.centerCount = source.centerCount;
  }
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
    centerCount: cluster.members.find((member) => member.hex === cluster.center)?.count ?? 0,
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
