import type { ExtractedPalette, PaletteCluster } from './types.js';

/**
 * Decision B (journal/OWNER_DECISIONS.md): a vivid background removed at step 2 is a brand colour (an app
 * tile, a logo shown on its brand-coloured square). Below this OKLCH chroma, white, greys and the pastel
 * cards of presentation boards are not proposed.
 */
export const VIVID_BACKGROUND_CHROMA = 0.1;

/**
 * Clusters to hand to assignRoles: the logo's clusters, led by the removed background when it is vivid.
 * Shares are rescaled to the retained pixels (background included) so they still sum to 1.
 */
export function brandClusters(palette: ExtractedPalette): readonly PaletteCluster[] {
  const { background, clusters } = palette;
  if (background === null || background.oklch.C < VIVID_BACKGROUND_CHROMA) return clusters;
  const rest = 1 - background.share;
  return [background, ...clusters.map((cluster) => ({ ...cluster, share: cluster.share * rest }))];
}
