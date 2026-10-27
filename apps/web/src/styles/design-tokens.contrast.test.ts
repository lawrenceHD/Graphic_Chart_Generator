import { readFileSync } from 'node:fs';
import { contrastRatio, oklchToHexMapped } from '@app/color-engine';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS } from './design-tokens.contrast';

// 09_DESIGN_SYSTEM §2: CI computes the declared text/background pairs with color-engine,
// in both themes (light-dark() in tokens.css), and fails under 4.5 (text) or 3 (components).

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

type Oklch = { readonly L: number; readonly C: number; readonly h: number };
const OKLCH = String.raw`oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)`;

const tokens = new Map<string, { readonly light: Oklch; readonly dark: Oklch }>();
for (const match of css.matchAll(
  new RegExp(String.raw`(--[\w-]+):\s*light-dark\(\s*${OKLCH}\s*,\s*${OKLCH}\s*\)`, 'g'),
)) {
  const n = match.slice(2).map(Number);
  tokens.set(match[1] ?? '', {
    light: { L: n[0] ?? NaN, C: n[1] ?? NaN, h: n[2] ?? NaN },
    dark: { L: n[3] ?? NaN, C: n[4] ?? NaN, h: n[5] ?? NaN },
  });
}

const hex = (name: string, theme: 'light' | 'dark'): string => {
  const token = tokens.get(name);
  if (token === undefined)
    throw new Error(`token ${name} missing or not an opaque light-dark() oklch`);
  const { L, C, h } = token[theme];
  return oklchToHexMapped(L, C, h);
};

describe('design tokens contrast (09_DESIGN_SYSTEM §2, §5)', () => {
  it('declares the minimum pairs required by the spec', () => {
    const names = CONTRAST_PAIRS.map((pair) => `${pair.fg} on ${pair.bg}`);
    for (const bg of ['--bg-canvas', '--bg-surface', '--bg-elevated']) {
      for (const fg of [
        '--text-primary',
        '--text-secondary',
        '--text-muted',
        '--border-strong',
        '--focus-ring',
      ]) {
        expect(names).toContain(`${fg} on ${bg}`);
      }
    }
    expect(names).toContain('--accent-contrast on --accent');
    for (const state of ['--success', '--warning', '--danger'])
      expect(names).toContain(`${state} on --bg-surface`);
  });

  for (const theme of ['light', 'dark'] as const) {
    it(`meets every declared minimum in the ${theme} theme`, () => {
      const failures = CONTRAST_PAIRS.flatMap((pair) => {
        const ratio = contrastRatio(hex(pair.fg, theme), hex(pair.bg, theme));
        const minimum = pair.kind === 'text' ? 4.5 : 3;
        return ratio >= minimum
          ? []
          : [`${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)} < ${String(minimum)}`];
      });
      expect(failures).toEqual([]);
    });
  }

  it('keeps preview backgrounds chromatically neutral (09 §1.1)', () => {
    const preview = tokens.get('--bg-preview');
    expect(preview?.light.C).toBe(0);
    expect(preview?.dark.C).toBe(0);
  });
});
