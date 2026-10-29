import { describe, expect, it } from 'vitest';
import { apply } from './commands.js';
import { PageOverridesSchema } from './schema.js';
import { makeDocument } from './test-fixtures.js';

// ADR-027 §4: pages are landscape by default (format absent), portrait per page through the generic override.
describe('page format override', () => {
  it('accepts landscape and portrait, rejects anything else', () => {
    expect(PageOverridesSchema.safeParse({ format: 'portrait' }).success).toBe(true);
    expect(PageOverridesSchema.safeParse({ format: 'landscape' }).success).toBe(true);
    expect(PageOverridesSchema.safeParse({ format: 'square' }).success).toBe(false);
  });

  it('sets portrait on one page, keeps its layout, and undoes back to the default', () => {
    const document = makeDocument();
    const result = apply(document, {
      type: 'SetPageOverride',
      pageId: 'page-mockup',
      key: 'format',
      value: 'portrait',
    });
    if (!result.ok) throw new Error(result.error.code);
    const page = result.value.doc.pages.find((entry) => entry.id === 'page-mockup');
    expect(page?.overrides).toEqual({ layout: 'split', format: 'portrait' });
    expect(result.value.inverse).toEqual({
      type: 'ClearPageOverride',
      pageId: 'page-mockup',
      key: 'format',
      expect: 'portrait',
    });

    const undone = apply(result.value.doc, result.value.inverse);
    if (!undone.ok) throw new Error(undone.error.code);
    expect(undone.value.doc).toEqual(document);
  });

  it('refuses an unknown format and a stale expectation', () => {
    expect(
      apply(makeDocument(), {
        type: 'SetPageOverride',
        pageId: 'page-cover',
        key: 'format',
        value: 'square',
      }),
    ).toEqual({ ok: false, error: { code: 'INVALID_COMMAND' } });
    expect(
      apply(makeDocument(), {
        type: 'SetPageOverride',
        pageId: 'page-cover',
        key: 'format',
        value: 'portrait',
        expect: 'landscape',
      }),
    ).toEqual({ ok: false, error: { code: 'EXPECTATION_FAILED' } });
  });

  it('changing the layout keeps the format', () => {
    const portrait = apply(makeDocument(), {
      type: 'SetPageOverride',
      pageId: 'page-mockup',
      key: 'format',
      value: 'portrait',
    });
    if (!portrait.ok) throw new Error(portrait.error.code);
    const relaid = apply(portrait.value.doc, {
      type: 'SetPageOverride',
      pageId: 'page-mockup',
      key: 'layout',
      value: 'grid',
    });
    if (!relaid.ok) throw new Error(relaid.error.code);
    expect(relaid.value.doc.pages.find((entry) => entry.id === 'page-mockup')?.overrides).toEqual({
      layout: 'grid',
      format: 'portrait',
    });
  });
});
