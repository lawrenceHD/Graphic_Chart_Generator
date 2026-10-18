import { relativeLuminance } from '@app/color-engine';

/** 05_ENGINES.md §5.1: a surface whose relative luminance is below 0.9 is ink, otherwise light. */
export const LIGHT_LUMINANCE = 0.9;

export type Paint =
  | { readonly kind: 'none' }
  | { readonly kind: 'color'; readonly luminance: number }
  | { readonly kind: 'server'; readonly id: string };

// CSS keywords commonly written by editors; anything unknown is treated as ink (painted, dark).
const NAMED: Readonly<Record<string, string>> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  orange: '#FFA500',
  purple: '#800080',
};

function hexOf(value: string): string | undefined {
  const text = value.trim().toLowerCase();
  const named = NAMED[text];
  if (named) return named;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text);
  if (short)
    return `#${short
      .slice(1)
      .map((digit) => digit + digit)
      .join('')}`;
  if (/^#[0-9a-f]{6}$/.test(text)) return text;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(text);
  if (!rgb) return undefined;
  const channels = rgb.slice(1).map((channel) => Math.min(255, Number(channel)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** Reads a sanitized fill or stroke value (sanitizeSvg already reduced url() to `url(#id)`). */
export function readPaint(value: string): Paint {
  const text = value.trim().toLowerCase();
  if (text === 'none' || text === 'transparent') return { kind: 'none' };
  const server = /^url\(#([^)]+)\)$/.exec(value.trim());
  if (server?.[1] !== undefined) return { kind: 'server', id: server[1] };
  const hex = hexOf(text);
  return { kind: 'color', luminance: hex === undefined ? 0 : relativeLuminance(hex) };
}

export function stopLuminance(stopColor: string | undefined): number {
  const paint = readPaint(stopColor ?? 'black');
  return paint.kind === 'color' ? paint.luminance : 0;
}
