import { err, ok, type Result } from '@app/kernel';
import type { Rgb } from './types.js';

const HEX_PATTERN = /^#[\da-f]{6}$/iu;

export function parseHex(input: string): Result<Rgb, 'INVALID_HEX'> {
  if (!HEX_PATTERN.test(input)) {
    return err('INVALID_HEX');
  }

  return ok({
    r: Number.parseInt(input.slice(1, 3), 16),
    g: Number.parseInt(input.slice(3, 5), 16),
    b: Number.parseInt(input.slice(5, 7), 16),
  });
}

export function toHex(rgb: Rgb): string {
  return `#${channelHex(rgb.r)}${channelHex(rgb.g)}${channelHex(rgb.b)}`;
}

// Internal entry point of every hex-taking function: a malformed value is a programming error upstream.
export function rgbFromValidatedHex(hex: string): Rgb {
  if (!HEX_PATTERN.test(hex)) {
    throw new RangeError('Expected a #RRGGBB hex color.');
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function channelHex(channel: number): string {
  const bounded = Math.min(255, Math.max(0, Math.round(channel)));
  return bounded.toString(16).padStart(2, '0').toUpperCase();
}
