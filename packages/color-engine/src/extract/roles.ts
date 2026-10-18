import { oklchToHexMapped } from '../gamut.js';
import { distanceOk } from './lab-cache.js';
import type { PaletteCluster, PaletteRoles, RoleOptions, RoleToken } from './types.js';

// 05_ENGINES.md §2.5 and §2.6.
export const DEFAULT_ROLE_OPTIONS: RoleOptions = { chromaticThreshold: 0.04, fallbackHue: 265 };
const ACCENT_MIN_SHARE = 0.02;
const ACCENT_MIN_DISTANCE = 0.12;
const NEUTRAL_DARK_MAX_L = 0.35;
const NEUTRAL_LIGHT_MIN_L = 0.9;
const EXTRA_MIN_SHARE = 0.02;
const MAX_EXTRA = 4;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
const extracted = (cluster: PaletteCluster): RoleToken => ({
  hex: cluster.hex,
  source: 'extracted',
});
const derived = (L: number, C: number, h: number): RoleToken => ({
  hex: oklchToHexMapped(L, C, h),
  source: 'derived',
});
const byHex = (first: PaletteCluster, second: PaletteCluster): number =>
  first.hex < second.hex ? -1 : first.hex > second.hex ? 1 : 0;

function pick(
  clusters: readonly PaletteCluster[],
  accept: (cluster: PaletteCluster) => boolean,
  order: (first: PaletteCluster, second: PaletteCluster) => number,
): PaletteCluster | undefined {
  return clusters
    .filter(accept)
    .sort((first, second) => order(first, second) || byHex(first, second))[0];
}

/** Roles are exclusive and assigned in the order primary, accent, neutralDark, neutralLight, extra. */
export function assignRoles(
  clusters: readonly PaletteCluster[],
  options: Partial<RoleOptions> = {},
): PaletteRoles {
  const { chromaticThreshold, fallbackHue } = { ...DEFAULT_ROLE_OPTIONS, ...options };
  const chromatic = (cluster: PaletteCluster): boolean => cluster.oklch.C >= chromaticThreshold;
  const taken = new Set<PaletteCluster>();
  const free = (cluster: PaletteCluster): boolean => !taken.has(cluster);

  const primary =
    pick(clusters, chromatic, (a, b) => b.share - a.share || b.oklch.C - a.oklch.C) ?? clusters[0];
  if (!primary) throw new RangeError('assignRoles needs at least one cluster.');
  taken.add(primary);

  const accent = pick(
    clusters,
    (cluster) =>
      free(cluster) &&
      chromatic(cluster) &&
      cluster.share >= ACCENT_MIN_SHARE &&
      distanceOk(cluster.oklab, primary.oklab) >= ACCENT_MIN_DISTANCE,
    (a, b) => b.oklch.C - a.oklch.C || b.share - a.share,
  );
  if (accent) taken.add(accent);
  const neutralDark = pick(
    clusters,
    (cluster) => free(cluster) && !chromatic(cluster) && cluster.oklch.L <= NEUTRAL_DARK_MAX_L,
    (a, b) => a.oklch.L - b.oklch.L,
  );
  if (neutralDark) taken.add(neutralDark);
  const neutralLight = pick(
    clusters,
    (cluster) => free(cluster) && !chromatic(cluster) && cluster.oklch.L >= NEUTRAL_LIGHT_MIN_L,
    (a, b) => b.oklch.L - a.oklch.L,
  );
  if (neutralLight) taken.add(neutralLight);
  const extra = clusters
    .filter((cluster) => free(cluster) && cluster.share >= EXTRA_MIN_SHARE)
    .slice(0, MAX_EXTRA);

  // §2.6: derivations follow the primary's hue, or fallbackHue when the primary is achromatic.
  const { L: Lp, C: Cp, h } = primary.oklch;
  const primaryChromatic = chromatic(primary);
  const hp = primaryChromatic && h !== null ? h : fallbackHue;
  return {
    primary: extracted(primary),
    accent: accent
      ? extracted(accent)
      : derived(
          Lp < 0.6 ? 0.75 : 0.55,
          clamp(Cp, 0.1, 0.2),
          primaryChromatic ? (hp + 180) % 360 : fallbackHue,
        ),
    neutralDark: neutralDark
      ? extracted(neutralDark)
      : derived(0.2, primaryChromatic ? 0.02 : 0, hp),
    neutralLight: neutralLight
      ? extracted(neutralLight)
      : derived(0.97, primaryChromatic ? 0.01 : 0, hp),
    extra: extra.map(extracted),
  };
}
