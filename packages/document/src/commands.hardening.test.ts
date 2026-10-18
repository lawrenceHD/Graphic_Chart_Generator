import { describe, expect, it } from 'vitest';
import { apply, applyInverse } from './commands.js';
import { makeDocument } from './test-fixtures.js';

const invalid = { ok: false, error: { code: 'INVALID_COMMAND' } };

describe('public commands versus stored inverses', () => {
  it('refuses the internal RestoreMockup from public callers', () => {
    const command = {
      type: 'RestoreMockup',
      pageId: 'page-mockup',
      hadMockup: true,
      previousMockup: { anything: 'goes' },
    };

    expect(apply(makeDocument(), command)).toEqual(invalid);
  });

  it('replays the RestoreMockup inverse through applyInverse', () => {
    const selected = apply(makeDocument(), {
      type: 'SelectScene',
      pageId: 'page-mockup',
      sceneId: 'scene-new',
      finish: 'emboss',
    });
    if (!selected.ok) throw new Error(selected.error.code);

    const undone = applyInverse(selected.value.doc, selected.value.inverse);
    expect(undone.ok && undone.value.doc).toEqual(makeDocument());
  });
});

describe('explicit page positions', () => {
  it('refuses a position that contradicts afterPageId', () => {
    // 'Zz' sorts before 'a0', so the page would land before the cover it should follow.
    const command = {
      type: 'ReorderPage',
      pageId: 'page-mockup',
      afterPageId: 'page-cover',
      position: 'Zz',
    };

    expect(apply(makeDocument(), command)).toEqual(invalid);
  });

  it('accepts a position strictly between the neighbours of afterPageId', () => {
    const result = apply(makeDocument(), {
      type: 'AddPage',
      pageId: 'page-new',
      pageType: 'tokens',
      afterPageId: 'page-cover',
      position: 'a0V',
    });

    expect(result.ok && result.value.doc.pages.at(-1)?.position).toBe('a0V');
  });

  it.each(['!!', 'a1', 'a0'])('refuses the malformed or colliding key %j', (position) => {
    const command = {
      type: 'AddPage',
      pageId: 'page-new',
      pageType: 'tokens',
      afterPageId: 'page-cover',
      position,
    };

    expect(apply(makeDocument(), command)).toEqual(invalid);
  });
});

describe('text normalisation and identifiers', () => {
  it('normalises brand values and page data to NFC instead of refusing them', () => {
    const decomposed = 'Café';
    const values = [0, 1, 2, 3].map(() => ({ label: decomposed, description: decomposed }));
    const brand = apply(makeDocument(), { type: 'SetBrandField', field: 'values', value: values });
    const page = apply(makeDocument(), {
      type: 'AddPage',
      pageId: 'page-new',
      pageType: 'tokens',
      afterPageId: null,
      data: { [decomposed]: [decomposed, { nested: decomposed }] },
    });

    expect(brand.ok && brand.value.doc.brand.values[0]).toEqual({
      label: 'Café',
      description: 'Café',
    });
    expect(page.ok && page.value.doc.pages.at(-1)?.data).toEqual({
      Café: ['Café', { nested: 'Café' }],
    });
  });

  it('refuses an empty page identifier', () => {
    expect(
      apply(makeDocument(), { type: 'AddPage', pageId: '', pageType: 'tokens', afterPageId: null }),
    ).toEqual(invalid);
  });
});
