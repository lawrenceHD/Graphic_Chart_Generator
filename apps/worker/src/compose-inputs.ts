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

/** Each extracted colour with its measured share of the logo; a derived colour is not in the logo. */
export function withShares(
  roles: Roles<RoleColor>,
  clusters: readonly { readonly hex: string; readonly share: number }[],
): Roles<ComposeColor> {
  const shares = new Map(clusters.map(({ hex, share }) => [hex.toUpperCase(), share]));
  const shared = (color: RoleColor): ComposeColor => {
    const share = color.source === 'extracted' ? shares.get(color.hex.toUpperCase()) : undefined;
    return share === undefined ? color : { ...color, share };
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
