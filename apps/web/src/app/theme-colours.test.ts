import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// globals.css clears Tailwind's palette (`--color-*: initial`): a utility naming a default colour that the
// theme does not define again produces no rule at all, silently (a white logo left on a cream page).
const SRC = join(import.meta.dirname, '..');
const theme = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8');
const defined = new Set([...theme.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((match) => match[1]));

const DEFAULT_PALETTE = [
  'white',
  'black',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];
const UTILITY =
  /(?<![\w-])(?:bg|text|border|outline|ring|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide)-((?:white|black)|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/\d+)?(?![\w-])/g;

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

describe('theme colours', () => {
  it('defines every default palette colour a component still names', () => {
    const missing = sources(SRC).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(UTILITY)]
        .map((match) => match[1] ?? '')
        .filter((name) => DEFAULT_PALETTE.includes(name.replace(/-\d+$/, '')) && !defined.has(name))
        .map((name) => `${file.slice(SRC.length + 1)}: ${name}`),
    );
    expect(missing).toEqual([]);
  });
});
