import { describe, expect, it } from 'vitest';
import { apply } from './commands.js';
import type { BrandDocument } from './schema.js';
import { deepFreeze, makeDocument } from './test-fixtures.js';

function applied(document: BrandDocument, command: unknown) {
  const result = apply(document, command);
  if (!result.ok) {
    throw new Error(`Command unexpectedly failed with ${result.error.code}.`);
  }
  return result.value;
}

describe('expect precondition (ADR-018)', () => {
  it('refuses SetColorToken when expect differs and leaves the document unchanged', () => {
    const document = deepFreeze(makeDocument());
    const original = structuredClone(document);

    const result = apply(document, {
      type: 'SetColorToken',
      token: 'primary',
      hex: '#000000',
      expect: '#123456',
    });

    expect(result).toEqual({ ok: false, error: { code: 'EXPECTATION_FAILED' } });
    expect(document).toEqual(original);
  });

  it('applies SetColorToken when expect matches the current value', () => {
    const next = applied(makeDocument(), {
      type: 'SetColorToken',
      token: 'primary',
      hex: '#000000',
      expect: '#1f4bff',
    });

    expect(next.doc.tokens.colors.primary).toEqual({ hex: '#000000', source: 'user' });
    expect(next.inverse).toEqual({
      type: 'SetColorToken',
      token: 'primary',
      hex: '#1F4BFF',
      source: 'extracted',
      expect: '#000000',
    });
  });

  it('refuses an out-of-order undo on the same token but accepts it on another token', () => {
    const start = makeDocument();
    const first = applied(start, { type: 'SetColorToken', token: 'primary', hex: '#111111' });
    const sameToken = applied(first.doc, {
      type: 'SetColorToken',
      token: 'primary',
      hex: '#222222',
    });
    const otherToken = applied(first.doc, {
      type: 'SetColorToken',
      token: 'accent',
      hex: '#222222',
    });

    expect(apply(sameToken.doc, first.inverse)).toEqual({
      ok: false,
      error: { code: 'EXPECTATION_FAILED' },
    });
    const undone = apply(otherToken.doc, first.inverse);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.value.doc.tokens.colors.primary).toEqual(start.tokens.colors.primary);
      expect(undone.value.doc.tokens.colors.accent.hex).toBe('#222222');
    }
  });

  it.each([
    [{ type: 'SetTypographyPairing', pairingId: 'tech-grotesk', expect: 'warm-serif' }],
    [{ type: 'SetBrandField', field: 'name', value: 'Autre', expect: 'Pas le nom' }],
    [{ type: 'SetPageField', pageId: 'page-cover', field: 'title', value: 'T', expect: 'X' }],
    [
      {
        type: 'SetPageOverride',
        pageId: 'page-cover',
        key: 'layout',
        value: 'grid',
        expect: 'split',
      },
    ],
    [{ type: 'ClearPageOverride', pageId: 'page-mockup', key: 'layout', expect: null }],
    [
      {
        type: 'SetLogoRules',
        clearSpaceRatio: 0.3,
        minSizePx: 32,
        minSizeMm: 10,
        expect: { clearSpaceRatio: 0.25, minSizePx: 24, minSizeMm: 8 },
      },
    ],
    [{ type: 'ReorderPage', pageId: 'page-mockup', afterPageId: null, expect: null }],
    [
      {
        type: 'RemovePage',
        pageId: 'page-cover',
        expect: { ...makeDocument().pages[0], title: 'Ancien titre' },
      },
    ],
    [{ type: 'SelectScene', pageId: 'page-mockup', sceneId: 's', finish: 'flat', expect: null }],
  ])('refuses %o when the current value differs from expect', (command) => {
    expect(apply(makeDocument(), command)).toEqual({
      ok: false,
      error: { code: 'EXPECTATION_FAILED' },
    });
  });
});

describe('RemovePage and AddPage (ADR-019)', () => {
  it('restores a removed page identically through its AddPage inverse', () => {
    const document = makeDocument();
    const removed = applied(document, { type: 'RemovePage', pageId: 'page-mockup' });

    expect(removed.inverse).toEqual({
      type: 'AddPage',
      pageId: 'page-mockup',
      pageType: 'mockup',
      afterPageId: 'page-cover',
      position: 'a1',
      title: 'Mockup',
      data: { caption: 'Scène actuelle', mockup: { sceneId: 'scene-old', finish: 'flat' } },
      overrides: { layout: 'split' },
      expect: null,
    });
    const restored = applied(removed.doc, removed.inverse);
    expect(restored.doc.pages.find((page) => page.id === 'page-mockup')).toEqual(
      document.pages.find((page) => page.id === 'page-mockup'),
    );
  });

  it('refuses an AddPage whose pageId already exists', () => {
    expect(
      apply(makeDocument(), {
        type: 'AddPage',
        pageId: 'page-cover',
        pageType: 'tokens',
        afterPageId: null,
      }),
    ).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
  });
});

describe('brand values (ADR-020)', () => {
  it('accepts four { label, description } values and refuses plain strings', () => {
    const values = ['A', 'B', 'C', 'D'].map((label) => ({ label, description: `${label} !` }));
    const next = applied(makeDocument(), { type: 'SetBrandField', field: 'values', value: values });

    expect(next.doc.brand.values).toEqual(values);
    expect(
      apply(makeDocument(), {
        type: 'SetBrandField',
        field: 'values',
        value: ['A', 'B', 'C', 'D'],
      }),
    ).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
  });
});
