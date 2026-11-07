import { describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json' with { type: 'json' };
import en from '../../messages/en.json' with { type: 'json' };
import productEn from '../../messages/product.en.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { PLANS } from './pricing-plans';

const flatten = (value: unknown, prefix = ''): Map<string, string> => {
  const entries = new Map<string, string>();
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, leaf] of flatten(child, prefix === '' ? key : `${prefix}.${key}`)) {
        entries.set(path, leaf);
      }
    }
  } else {
    entries.set(prefix, String(value));
  }
  return entries;
};
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1] ?? '').sort();

describe('product messages (home, pricing, auth, dashboard)', () => {
  const frKeys = flatten(productFr);
  const enKeys = flatten(productEn);

  it('has the same keys and placeholders in French and English', () => {
    expect([...enKeys.keys()].sort()).toEqual([...frKeys.keys()].sort());
    for (const [key, text] of frKeys) {
      expect(placeholders(enKeys.get(key) ?? ''), key).toEqual(placeholders(text));
    }
  });

  it('has no empty text and no emoji', () => {
    for (const [key, text] of [...frKeys, ...enKeys]) {
      expect(text.trim(), key).not.toBe('');
      expect(/\p{Emoji_Presentation}/u.test(text), key).toBe(false);
    }
  });

  it('does not shadow a studio namespace', () => {
    const studio = new Set([...Object.keys(fr), ...Object.keys(en)]);
    for (const namespace of Object.keys(productFr))
      expect(studio.has(namespace), namespace).toBe(false);
  });

  it('has a name, an audience and every feature text for each plan', () => {
    for (const plan of PLANS) {
      expect(frKeys.has(`pricing.plans.${plan.id}.name`)).toBe(true);
      expect(frKeys.has(`pricing.plans.${plan.id}.audience`)).toBe(true);
      for (const feature of plan.features) {
        expect(frKeys.has(`pricing.feature.${feature}`), feature).toBe(true);
      }
    }
  });
});
