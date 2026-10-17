import { describe, expect, it } from 'vitest';
import { apply } from './commands.js';
import { makeDocument } from './test-fixtures.js';

describe('apply command validation and errors', () => {
  it('does not mutate a deeply frozen document', () => {
    const document = makeDocument();
    const original = structuredClone(document);
    deepFreeze(document);
    const result = apply(document, {
      type: 'SetBrandField',
      field: 'name',
      value: 'Nouvelle marque',
    });

    expect(result.ok).toBe(true);
    expect(document).toEqual(original);
    if (result.ok) {
      expect(result.value.doc).not.toBe(document);
      expect(result.value.doc.brand.name).toBe('Nouvelle marque');
    }
  });

  it('returns PAGE_NOT_FOUND for a missing page and keeps the document unchanged', () => {
    const document = makeDocument();
    const result = apply(document, {
      type: 'SetPageField',
      pageId: 'missing-page',
      field: 'title',
      value: 'Titre',
    });

    expect(result).toEqual({ ok: false, error: { code: 'PAGE_NOT_FOUND' } });
    expect(document.pages[0]?.title).toBe('Couverture');
  });

  it('rejects malformed hex and stores valid lowercase hex in uppercase', () => {
    const document = makeDocument();
    const malformed = apply(document, {
      type: 'SetColorToken',
      token: 'primary',
      hex: '#abc',
    });
    const accepted = apply(document, {
      type: 'SetColorToken',
      token: 'primary',
      hex: '#1f4bff',
    });

    expect(malformed).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.value.doc.tokens.colors.primary.hex).toBe('#1F4BFF');
      expect(accepted.value.doc.tokens.colors.primary.source).toBe('user');
    }
  });

  it('returns VALUE_OUT_OF_RANGE for logo rules outside their specified bounds', () => {
    const result = apply(makeDocument(), {
      type: 'SetLogoRules',
      clearSpaceRatio: 0.51,
      minSizePx: 24,
      minSizeMm: 8,
    });

    expect(result).toEqual({ ok: false, error: { code: 'VALUE_OUT_OF_RANGE' } });
  });

  it('rejects typography identifiers outside the closed catalogue', () => {
    const result = apply(makeDocument(), {
      type: 'SetTypographyPairing',
      pairingId: 'unlisted-font-pairing',
    });

    expect(result).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
  });

  it('normalizes command text to NFC and refuses HTML-like content', () => {
    const document = makeDocument();
    const normalized = apply(document, {
      type: 'SetBrandField',
      field: 'name',
      value: 'Cafe\u0301',
    });
    const rejected = apply(document, {
      type: 'SetBrandField',
      field: 'name',
      value: '<script>blocked</script>',
    });

    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.value.doc.brand.name).toBe('Café');
    }
    expect(rejected).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
  });

  it('does not create a new key with SetPageField', () => {
    const result = apply(makeDocument(), {
      type: 'SetPageField',
      pageId: 'page-cover',
      field: 'new-field',
      value: 'not added',
    });

    expect(result).toEqual({ ok: false, error: { code: 'FIELD_NOT_ALLOWED' } });
  });

  it('returns FIELD_NOT_ALLOWED when selecting a scene on a non-mockup page', () => {
    const result = apply(makeDocument(), {
      type: 'SelectScene',
      pageId: 'page-cover',
      sceneId: 'scene-new',
      finish: 'foil',
    });

    expect(result).toEqual({ ok: false, error: { code: 'FIELD_NOT_ALLOWED' } });
  });

  it('rejects an AddPage result that would exceed the document byte limit', () => {
    const data: Record<string, unknown> = {};
    for (let index = 0; index < 270; index += 1) {
      data[`field-${String(index)}`] = 'x'.repeat(2000);
    }
    const result = apply(makeDocument(), {
      type: 'AddPage',
      pageId: 'page-large',
      pageType: 'tokens',
      afterPageId: null,
      data,
    });

    expect(result).toEqual({ ok: false, error: { code: 'DOCUMENT_TOO_LARGE' } });
  });
});

function deepFreeze(value: unknown): void {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && 'value' in descriptor) {
      deepFreeze(descriptor.value);
    }
  }

  Object.freeze(value);
}
