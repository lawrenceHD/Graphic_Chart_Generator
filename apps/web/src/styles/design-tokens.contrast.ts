// Reference table of 09_DESIGN_SYSTEM §2: every pair is checked in both themes by
// design-tokens.contrast.test.ts (≥ 4.5 for text, ≥ 3 for components and focus).

export type ContrastPair = {
  readonly fg: string;
  readonly bg: string;
  readonly kind: 'text' | 'component';
};

const BACKGROUNDS = ['--bg-canvas', '--bg-surface', '--bg-elevated'] as const;

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...BACKGROUNDS.flatMap((bg) => [
    { fg: '--text-primary', bg, kind: 'text' as const },
    { fg: '--text-secondary', bg, kind: 'text' as const },
    { fg: '--text-muted', bg, kind: 'text' as const },
    { fg: '--border-strong', bg, kind: 'component' as const },
    { fg: '--focus-ring', bg, kind: 'component' as const },
    { fg: '--accent', bg, kind: 'component' as const },
  ]),
  { fg: '--accent-contrast', bg: '--accent', kind: 'text' },
  // States always combine icon + text + colour (§5); the colour carries the icon and text.
  { fg: '--success', bg: '--bg-surface', kind: 'text' },
  { fg: '--warning', bg: '--bg-surface', kind: 'text' },
  { fg: '--danger', bg: '--bg-surface', kind: 'text' },
];
