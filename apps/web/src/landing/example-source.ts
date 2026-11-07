import { contrastRatio, formatRatio, wcagLevel, type WcagLevel } from '@app/color-engine';
import type { BrandView } from '../studio/workspace/brand-view';
import { demoFor } from './demo';
import { EXAMPLES } from './examples';

// Seam between the home page and the example set (landing/examples): the page reads this plain-data shape
// and nothing else, so no brand is named in product code.
export type ColorRole = 'primary' | 'accent' | 'neutralLight' | 'neutralDark';

export interface LandingExample {
  readonly id: string;
  readonly name: string;
  readonly sector: string | null;
  readonly logo: string;
  readonly colors: readonly { readonly role: ColorRole; readonly hex: string }[];
  readonly contrasts: readonly {
    readonly foreground: ColorRole;
    readonly background: ColorRole;
    readonly ratio: string;
    readonly level: WcagLevel;
  }[];
  readonly fonts: { readonly display: string; readonly text: string };
  /** CSS custom properties, one per line, as the export would write them. */
  readonly tokens: readonly string[];
}

const ROLES: readonly ColorRole[] = ['primary', 'accent', 'neutralLight', 'neutralDark'];
const TOKEN_NAME: Readonly<Record<ColorRole, string>> = {
  primary: 'primary',
  accent: 'accent',
  neutralLight: 'paper',
  neutralDark: 'ink',
};
/** Pairs a designer would actually use: text on paper, the better text colour on the brand field, and the brand
 * colour as text only where it reads (3:1). A relevant pair that fails is still shown, with its verdict. */
function contrastPairs(
  colors: Readonly<Record<ColorRole, string>>,
): readonly (readonly [ColorRole, ColorRole])[] {
  const onPaper = contrastRatio(colors.neutralLight, colors.primary);
  const onInk = contrastRatio(colors.neutralDark, colors.primary);
  const pairs: (readonly [ColorRole, ColorRole])[] = [
    ['neutralDark', 'neutralLight'],
    [onPaper >= onInk ? 'neutralLight' : 'neutralDark', 'primary'],
  ];
  if (contrastRatio(colors.primary, colors.neutralLight) >= 3)
    pairs.push(['primary', 'neutralLight']);
  return pairs;
}

export function exampleFromView(id: string, view: BrandView): LandingExample {
  return {
    id,
    name: view.name,
    sector: view.sector,
    logo: view.logo.color,
    colors: ROLES.map((role) => ({ role, hex: view.colors[role] })),
    contrasts: contrastPairs(view.colors).map(([foreground, background]) => {
      const ratio = contrastRatio(view.colors[foreground], view.colors[background]);
      return { foreground, background, ratio: formatRatio(ratio), level: wcagLevel(ratio) };
    }),
    fonts: { display: view.pairing.display.name, text: view.pairing.text.name },
    tokens: [
      ...ROLES.map((role) => `--color-${TOKEN_NAME[role]}: ${view.colors[role]};`),
      `--font-display: ${view.pairing.display.name};`,
    ],
  };
}

/** Every demonstration brand of landing/examples, composed by the studio's engines (demoFor). */
export function listExamples(): readonly LandingExample[] {
  return EXAMPLES.map((example) => exampleFromView(example.id, demoFor(example.id).view));
}
