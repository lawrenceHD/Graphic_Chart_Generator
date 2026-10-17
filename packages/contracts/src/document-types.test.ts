import { describe, expect, it } from 'vitest';
import {
  BrandValueSchema,
  PAIRING_IDS,
  PageTypeSchema,
  ToneAxisSchema,
  VariantRefSchema,
} from './index.js';

describe('shared document contracts', () => {
  it('accepts only the stable page identifiers', () => {
    expect(PageTypeSchema.safeParse('clear-space').success).toBe(true);
    expect(PageTypeSchema.safeParse('mockup').success).toBe(true);
    expect(PageTypeSchema.safeParse('colors').success).toBe(false);
  });

  it('exports the closed typography catalogue', () => {
    expect(PAIRING_IDS).toEqual([
      'editorial-classic',
      'modern-geometric',
      'tech-grotesk',
      'warm-serif',
      'luxury-light',
      'friendly-soft',
      'bold-display',
      'humanist-book',
    ]);
  });

  it('validates tone axes and variant references', () => {
    expect(ToneAxisSchema.safeParse({ id: 'formal-casual', value: 50 }).success).toBe(true);
    expect(ToneAxisSchema.safeParse({ id: 'formal-casual', value: 50.5 }).success).toBe(false);
    expect(
      VariantRefSchema.safeParse({
        assetId: 'asset-1',
        kind: 'favicon',
        needsReview: false,
        fidelity: 0.98,
      }).success,
    ).toBe(true);
    expect(
      VariantRefSchema.safeParse({
        assetId: 'asset-1',
        kind: 'favicon',
        needsReview: false,
        fidelity: 1.2,
      }).success,
    ).toBe(false);
  });

  it('bounds brand values to a 24-character label and a 120-character description', () => {
    expect(
      BrandValueSchema.safeParse({ label: 'Soin', description: 'Chaque détail.' }).success,
    ).toBe(true);
    expect(BrandValueSchema.safeParse({ label: 'x'.repeat(25), description: 'ok' }).success).toBe(
      false,
    );
    expect(BrandValueSchema.safeParse({ label: 'ok', description: 'x'.repeat(121) }).success).toBe(
      false,
    );
    expect(BrandValueSchema.safeParse('Soin').success).toBe(false);
  });
});
