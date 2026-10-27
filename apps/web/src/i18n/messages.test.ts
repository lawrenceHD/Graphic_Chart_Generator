import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json' with { type: 'json' };
import fr from '../../messages/fr.json' with { type: 'json' };

// Flattens nested message objects into dotted keys ("common.theme.label").
const flatten = (value: unknown, prefix = ''): Map<string, unknown> => {
  const entries = new Map<string, unknown>();
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, leaf] of flatten(child, prefix === '' ? key : `${prefix}.${key}`)) {
        entries.set(path, leaf);
      }
    }
  } else {
    entries.set(prefix, value);
  }
  return entries;
};

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)/g)].map((match) => match[1] ?? '').sort();

describe('interface messages (AGENTS.md §4: no hard-coded interface text)', () => {
  const frKeys = flatten(fr);
  const enKeys = flatten(en);

  it('has the same keys in French and English', () => {
    expect([...enKeys.keys()].sort()).toEqual([...frKeys.keys()].sort());
  });

  it('has only non-empty strings', () => {
    for (const [key, text] of [...frKeys, ...enKeys]) {
      expect(typeof text, key).toBe('string');
      expect(String(text).trim(), key).not.toBe('');
    }
  });

  it('uses the same ICU placeholders in both languages', () => {
    for (const [key, text] of frKeys) {
      expect(placeholders(String(enKeys.get(key))), key).toEqual(placeholders(String(text)));
    }
  });

  it('covers the timeline texts of 09_DESIGN_SYSTEM §7 in French', () => {
    expect(frKeys.get('analysis.steps.read')).toBe('Lecture du logo et vérification du fichier…');
    expect(frKeys.get('analysis.steps.assemble')).toBe('Assemblage de la charte…');
  });
});
