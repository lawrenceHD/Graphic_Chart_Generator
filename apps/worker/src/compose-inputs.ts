import type { ComposeColor, ComposeInput } from '@app/document';
import type { LogoMeasure } from '@app/logo-kit';

// Inputs of the document composition measured on the logo (ADR-035): the share of each colour and the
// logo rules per version. Pure, so the step reads the same as its tests.

interface RoleColor {
  readonly hex: string;
  readonly source: 'extracted' | 'derived';
}

interface Roles<Color> {
  readonly primary: Color;
  readonly accent: Color;
  readonly neutralLight: Color;
  readonly neutralDark: Color;
  readonly extra: readonly Color[];
}

/**
 * Each extracted colour with its share of the role colours measured on the logo: a hex held by two roles is
 * counted once (first role), the shares are scaled to sum to 1, a derived colour is not in the logo.
 */
export function withShares(
  roles: Roles<RoleColor>,
  clusters: readonly { readonly hex: string; readonly share: number }[],
): Roles<ComposeColor> {
  const shares = new Map(clusters.map(({ hex, share }) => [hex.toUpperCase(), share]));
  const ordered = [
    roles.primary,
    roles.accent,
    roles.neutralLight,
    roles.neutralDark,
    ...roles.extra,
  ];
  const counted = new Map<RoleColor, number>();
  const seen = new Set<string>();
  for (const color of ordered) {
    const hex = color.hex.toUpperCase();
    const share = color.source === 'extracted' ? shares.get(hex) : undefined;
    if (share === undefined || seen.has(hex)) continue;
    seen.add(hex);
    counted.set(color, share);
  }
  const total = [...counted.values()].reduce((sum, share) => sum + share, 0);
  const shared = (color: RoleColor): ComposeColor => {
    const share = counted.get(color);
    return share === undefined || total <= 0 ? color : { ...color, share: share / total };
  };
  return {
    primary: shared(roles.primary),
    accent: shared(roles.accent),
    neutralLight: shared(roles.neutralLight),
    neutralDark: shared(roles.neutralDark),
    extra: roles.extra.map(shared),
  };
}

/** R6, R7: x as a share of the logo height, the minimum of the logo and of its symbol alone. */
export function rulesOf(
  measure: Pick<LogoMeasure, 'bbox' | 'clearSpace' | 'minimum' | 'symbolMinimum'>,
): NonNullable<ComposeInput['logoRules']> {
  const { bbox, clearSpace, minimum, symbolMinimum } = measure;
  return {
    clearSpaceRatio: clearSpace.x / bbox.height,
    minSizePx: minimum.widthPx,
    minSizeMm: minimum.widthMm,
    clearSpaceSource: clearSpace.source,
    versions:
      symbolMinimum === undefined ? { full: minimum } : { full: minimum, symbol: symbolMinimum },
  };
}
