import type { Paint } from '@app/contracts';
import type { BrandDocument } from '../schema.js';

type Colors = BrandDocument['tokens']['colors'];
type Role = Paint['role'];

const WHITE = '#FFFFFF';
const BLACK = '#000000';
// Same thresholds as logoFor in the studio (mockups/artwork.ts): a mark read at size, not body text.
const REVERSED_MIN = 2.2;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** WCAG 2.2 contrast ratio of two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function paint(colors: Colors, role: Role): Paint {
  switch (role) {
    case 'white':
      return { role, hex: WHITE };
    case 'black':
      return { role, hex: BLACK };
    default:
      return { role, hex: colors[role].hex };
  }
}

/**
 * Text colour on a flat background (WCAG 1.4.3: 4.5:1, 3:1 for large text): the brand neutral that
 * contrasts most if it passes, else white or black, one of which always passes 4.5:1. Taking the strongest
 * neutral first keeps a headline and a caption on the same ink, so the colour count stays at three.
 */
export function inkOn(
  colors: Colors,
  background: Paint,
  large: boolean,
): { readonly ink: Paint; readonly contrast: number } {
  const need = large ? 3 : 4.5;
  const rated = (role: Role) => {
    const ink = paint(colors, role);
    return { ink, contrast: Math.round(contrast(ink.hex, background.hex) * 100) / 100 };
  };
  const [dark, light] = [rated('neutralDark'), rated('neutralLight')];
  const neutral = dark.contrast >= light.contrast ? dark : light;
  if (neutral.contrast >= need) return neutral;
  const [white, black] = [rated('white'), rated('black')];
  return white.contrast >= black.contrast ? white : black;
}

/** The version of the logo on a flat background: colour on light stock, else reversed. */
export function logoTone(colors: Colors, background: Paint): 'color' | 'white' | 'black' {
  if (contrast(background.hex, WHITE) < 1.25) return 'color';
  if (contrast(background.hex, colors.neutralLight.hex) < 1.2) return 'color';
  return contrast(WHITE, background.hex) >= REVERSED_MIN ? 'white' : 'black';
}
