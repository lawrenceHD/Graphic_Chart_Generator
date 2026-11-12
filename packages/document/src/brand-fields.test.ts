import { describe, expect, it } from 'vitest';
import { apply, applyInverse } from './commands.js';
import { migrate } from './migrate.js';
import { BrandDocumentSchema } from './schema.js';
import { makeDocument } from './test-fixtures.js';

const contact = { phone: '+237 6 00 00 00 00', email: 'bonjour@exemple.org' };

describe('brand.tagline and brand.contact (ADR-036)', () => {
  it('reads a version 1 document without them, unchanged by migrate', () => {
    const document = makeDocument();
    const result = migrate(document);
    expect(result.ok).toBe(true);
    if (result.ok) expect('tagline' in result.value.brand).toBe(false);
  });

  it('accepts both fields and refuses an unknown contact key or an empty tagline', () => {
    const document = makeDocument();
    const filled = {
      ...document,
      brand: { ...document.brand, tagline: 'Le goût du marché', contact },
    };
    expect(BrandDocumentSchema.safeParse(filled).success).toBe(true);
    const unknown = { ...document, brand: { ...document.brand, contact: { fax: '00' } } };
    expect(BrandDocumentSchema.safeParse(unknown).success).toBe(false);
    const empty = { ...document, brand: { ...document.brand, tagline: '' } };
    expect(BrandDocumentSchema.safeParse(empty).success).toBe(false);
  });

  it('sets the tagline, and its inverse removes it again', () => {
    const document = makeDocument();
    const set = apply(document, { type: 'SetBrandField', field: 'tagline', value: 'Cuisiné ici' });
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(set.value.doc.brand.tagline).toBe('Cuisiné ici');
    expect(set.value.inverse).toEqual({
      type: 'SetBrandField',
      field: 'tagline',
      value: null,
      expect: 'Cuisiné ici',
    });
    const undone = applyInverse(set.value.doc, set.value.inverse);
    expect(undone.ok).toBe(true);
    if (undone.ok) expect(undone.value.doc).toEqual(document);
  });

  it('replaces a tagline, and its inverse brings the previous one back', () => {
    const base = makeDocument();
    const document = { ...base, brand: { ...base.brand, tagline: 'Avant' } };
    const set = apply(document, { type: 'SetBrandField', field: 'tagline', value: 'Après' });
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    const undone = applyInverse(set.value.doc, set.value.inverse);
    expect(undone.ok && undone.value.doc.brand.tagline).toBe('Avant');
  });

  it('clears the contact with null and restores it with the inverse', () => {
    const base = makeDocument();
    const document = { ...base, brand: { ...base.brand, contact } };
    const cleared = apply(document, { type: 'SetBrandField', field: 'contact', value: null });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect('contact' in cleared.value.doc.brand).toBe(false);
    const restored = applyInverse(cleared.value.doc, cleared.value.inverse);
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value.doc.brand.contact).toEqual(contact);
  });

  it('checks expect against the current value, null standing for absent', () => {
    const document = makeDocument();
    expect(
      apply(document, { type: 'SetBrandField', field: 'contact', value: contact, expect: null }).ok,
    ).toBe(true);
    expect(
      apply(document, { type: 'SetBrandField', field: 'tagline', value: 'A', expect: 'B' }),
    ).toEqual({ ok: false, error: { code: 'EXPECTATION_FAILED' } });
  });

  it('refuses markup, an over-long tagline and an empty contact', () => {
    const document = makeDocument();
    for (const value of ['<i>x</i>', 'x'.repeat(121)]) {
      expect(apply(document, { type: 'SetBrandField', field: 'tagline', value })).toEqual({
        ok: false,
        error: { code: 'INVALID_COMMAND' },
      });
    }
    expect(apply(document, { type: 'SetBrandField', field: 'contact', value: {} })).toEqual({
      ok: false,
      error: { code: 'INVALID_COMMAND' },
    });
  });

  it('stores the tagline in NFC', () => {
    const result = apply(makeDocument(), {
      type: 'SetBrandField',
      field: 'tagline',
      value: 'Cuisiné',
    });
    expect(result.ok && result.value.doc.brand.tagline).toBe('Cuisiné');
  });
});
