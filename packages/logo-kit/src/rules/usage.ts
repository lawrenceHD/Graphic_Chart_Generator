import { contrastRatio } from '@app/color-engine';
import type { PaletteHexes } from './dos-donts.js';

// R3 (graphic elements, 3:1), R5 (versions) and R9 (usage on backgrounds) of 16_GUIDELINE_RULES.md.
const GRAPHIC_CONTRAST = 3;
const WHITE = '#FFFFFF';
const BLACK = '#000000';
/**
 * Representative tones of a light and a dark photograph: the page shows a real photo, the choice of the
 * version is made on its mean tone.
 */
export const PHOTO_TONES = { light: '#D8D2C8', dark: '#2A2724' } as const;

export type LogoVersion = 'colour' | 'black' | 'white';
export type VersionKey = 'colour' | 'negative' | 'black' | 'white';
export interface VersionSpec {
  readonly key: VersionKey;
  readonly version: LogoVersion;
  readonly background: string;
}
export interface VersionChoice {
  readonly version: LogoVersion;
  /** Lowest contrast between the background and the colours of the chosen version. */
  readonly contrast: number;
}
export type BackgroundKind =
  'light' | 'dark' | 'brand' | 'photo-light' | 'photo-dark' | 'forbidden';
export interface BackgroundUsage extends VersionChoice {
  readonly kind: BackgroundKind;
  readonly background: string;
}

const lowest = (background: string, colours: readonly string[]): number =>
  Math.min(...colours.map((colour) => contrastRatio(background, colour)));

/** R5: the versions every charter shows, in order, each on the background it is made for. */
export function logoVersions(palette: PaletteHexes): VersionSpec[] {
  const versions: VersionSpec[] = [
    { key: 'colour', version: 'colour', background: palette.neutralLight },
  ];
  if (contrastRatio(WHITE, palette.primary) >= GRAPHIC_CONTRAST)
    versions.push({ key: 'negative', version: 'white', background: palette.primary });
  versions.push(
    { key: 'black', version: 'black', background: WHITE },
    { key: 'white', version: 'white', background: palette.neutralDark },
  );
  return versions;
}

/** The colour logo while all its colours read at 3:1 on the background, else white or black. */
export function chooseVersion(background: string, logoColours: readonly string[]): VersionChoice {
  const colour = lowest(background, logoColours);
  if (logoColours.length > 0 && colour >= GRAPHIC_CONTRAST)
    return { version: 'colour', contrast: colour };
  const white = contrastRatio(background, WHITE);
  const black = contrastRatio(background, BLACK);
  return white >= black
    ? { version: 'white', contrast: white }
    : { version: 'black', contrast: black };
}

/** R9: the logo on light, dark, brand and photo backgrounds, then the colour logo where it fails. */
export function backgroundBoard(
  palette: PaletteHexes,
  logoColours: readonly string[],
): BackgroundUsage[] {
  const backgrounds: [BackgroundKind, string][] = [
    ['light', palette.neutralLight],
    ['dark', palette.neutralDark],
    ['brand', palette.primary],
    ['photo-light', PHOTO_TONES.light],
    ['photo-dark', PHOTO_TONES.dark],
  ];
  // The light background is the home of the colour version (R5 A): a multicolour mark keeps its pale
  // colours there, as every charter shows it, provided one colour reads at 3:1 and carries the shape. A
  // one-colour logo gets no such exception (R3).
  const home = (background: string): boolean =>
    logoColours.length >= 2 &&
    Math.max(...logoColours.map((colour) => contrastRatio(background, colour))) >= GRAPHIC_CONTRAST;
  const board: BackgroundUsage[] = backgrounds.map(([kind, background]) =>
    kind === 'light' && home(background)
      ? {
          kind,
          background,
          version: 'colour',
          contrast: Math.max(...logoColours.map((colour) => contrastRatio(background, colour))),
        }
      : { kind, background, ...chooseVersion(background, logoColours) },
  );
  // Forbidden: the colour logo on the background where it reads worst, its home excepted.
  const worst = backgrounds
    .filter(([kind]) => kind !== 'light')
    .map(([, background]) => ({ background, contrast: lowest(background, logoColours) }))
    .sort((a, b) => a.contrast - b.contrast)[0];
  if (worst !== undefined && worst.contrast < GRAPHIC_CONTRAST)
    board.push({ kind: 'forbidden', version: 'colour', ...worst });
  return board;
}
