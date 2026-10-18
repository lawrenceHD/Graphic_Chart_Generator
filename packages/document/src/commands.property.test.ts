import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { PAIRING_IDS } from '@app/contracts';
import { apply, applyInverse } from './commands.js';
import type { BrandDocument } from './schema.js';
import { deepFreeze, makeDocument } from './test-fixtures.js';

const safeText = fc
  .string({ maxLength: 60 })
  .map((value) => value.normalize('NFC'))
  .filter((value) => !/<[A-Za-z/!]/u.test(value));
const validDocuments = fc
  .tuple(safeText, safeText)
  .map(([brandName, pageTitle]) => withText(makeDocument(), brandName, pageTitle));

describe('apply inverse properties', () => {
  it('round-trips SetColorToken, including source', () => {
    fc.assert(
      fc.property(
        validDocuments,
        fc.constantFrom('#AABBCC', '#102030', '#FFFFFF'),
        (document, hex) => {
          roundTrip(document, { type: 'SetColorToken', token: 'primary', hex, source: 'user' });
        },
      ),
    );
  });

  it('round-trips SetTypographyPairing for the closed catalogue', () => {
    fc.assert(
      fc.property(validDocuments, fc.constantFrom(...PAIRING_IDS), (document, pairingId) => {
        roundTrip(document, { type: 'SetTypographyPairing', pairingId });
      }),
    );
  });

  it('round-trips each allowed SetBrandField value shape', () => {
    fc.assert(
      fc.property(validDocuments, safeText, (document, value) => {
        roundTrip(document, { type: 'SetBrandField', field: 'name', value });
        roundTrip(document, { type: 'SetBrandField', field: 'mission', value });
        roundTrip(document, { type: 'SetBrandField', field: 'vision', value });
        roundTrip(document, {
          type: 'SetBrandField',
          field: 'values',
          value: [0, 1, 2, 3].map((index) => ({
            label: `Valeur ${String(index)}`,
            description: value,
          })),
        });
        roundTrip(document, { type: 'SetBrandField', field: 'archetype', value: 'sage' });
      }),
    );
  });

  it('round-trips SetPageField for title and an existing string data field', () => {
    fc.assert(
      fc.property(validDocuments, safeText, (document, value) => {
        roundTrip(document, {
          type: 'SetPageField',
          pageId: 'page-cover',
          field: 'title',
          value,
        });
        roundTrip(document, {
          type: 'SetPageField',
          pageId: 'page-cover',
          field: 'subtitle',
          value,
        });
      }),
    );
  });

  it('round-trips SetPageOverride and ClearPageOverride', () => {
    fc.assert(
      fc.property(validDocuments, (document) => {
        roundTrip(document, {
          type: 'SetPageOverride',
          pageId: 'page-cover',
          key: 'background',
          value: '#AABBCC',
        });
        roundTrip(document, {
          type: 'SetPageOverride',
          pageId: 'page-cover',
          key: 'layout',
          value: 'grid',
        });
        roundTrip(document, {
          type: 'ClearPageOverride',
          pageId: 'page-mockup',
          key: 'layout',
        });
        roundTrip(document, {
          type: 'ClearPageOverride',
          pageId: 'page-cover',
          key: 'layout',
        });
      }),
    );
  });

  it('round-trips SetLogoRules across valid boundary values', () => {
    fc.assert(
      fc.property(
        validDocuments,
        fc.integer({ min: 10, max: 50 }),
        fc.integer({ min: 8, max: 512 }),
        fc.integer({ min: 2, max: 100 }),
        (document, ratio, minSizePx, minSizeMm) => {
          roundTrip(document, {
            type: 'SetLogoRules',
            clearSpaceRatio: ratio / 100,
            minSizePx,
            minSizeMm,
          });
        },
      ),
    );
  });

  it('round-trips ReorderPage using both generated and exact positions', () => {
    fc.assert(
      fc.property(validDocuments, (document) => {
        roundTrip(document, {
          type: 'ReorderPage',
          pageId: 'page-cover',
          afterPageId: 'page-mockup',
        });
        roundTrip(document, {
          type: 'ReorderPage',
          pageId: 'page-cover',
          afterPageId: null,
          position: 'a0',
        });
      }),
    );
  });

  it('round-trips AddPage and its caller-supplied identifier', () => {
    fc.assert(
      fc.property(validDocuments, safeText, (document, title) => {
        roundTrip(document, {
          type: 'AddPage',
          pageId: 'page-added',
          pageType: 'tokens',
          afterPageId: 'page-cover',
          title,
          data: { label: title },
          overrides: { layout: 'minimal' },
        });
      }),
    );
  });

  it('round-trips RemovePage with a complete page snapshot', () => {
    fc.assert(
      fc.property(validDocuments, (document) => {
        roundTrip(document, { type: 'RemovePage', pageId: 'page-mockup' });
      }),
    );
  });

  it('round-trips SelectScene and restores the prior mockup value', () => {
    fc.assert(
      fc.property(validDocuments, safeText, (document, sceneId) => {
        roundTrip(document, {
          type: 'SelectScene',
          pageId: 'page-mockup',
          sceneId,
          finish: 'emboss',
        });
      }),
    );
  });

  it('uses an internal inverse to remove data.mockup when it was absent', () => {
    const document = withoutMockup(makeDocument());
    const applied = apply(document, {
      type: 'SelectScene',
      pageId: 'page-mockup',
      sceneId: 'scene-new',
      finish: 'foil',
    });

    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    expect(applied.value.inverse).toEqual({
      type: 'RestoreMockup',
      pageId: 'page-mockup',
      hadMockup: false,
      expect: { sceneId: 'scene-new', finish: 'foil' },
    });

    const restored = applyInverse(applied.value.doc, applied.value.inverse);
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.value.doc).toEqual(document);
    }
  });

  it('keeps twenty generated page reorderings in the reference order with unique keys', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 1 }), fc.integer({ min: 0, max: 2 })), {
          minLength: 20,
          maxLength: 20,
        }),
        (moves) => {
          let document = makeDocument();
          let expectedOrder = ['page-cover', 'page-mockup'];
          for (const [targetIndex, anchorIndex] of moves) {
            const targetId = expectedOrder[targetIndex];
            if (!targetId) {
              throw new Error('The reorder generator must select an existing page.');
            }
            const otherPageId = expectedOrder.find((pageId) => pageId !== targetId);
            const afterPageId = anchorIndex === 2 || !otherPageId ? null : otherPageId;
            const result = apply(document, { type: 'ReorderPage', pageId: targetId, afterPageId });
            expect(result.ok).toBe(true);
            if (result.ok) {
              document = result.value.doc;
            }
            expectedOrder = expectedOrder.filter((pageId) => pageId !== targetId);
            if (afterPageId === null) {
              expectedOrder.unshift(targetId);
            } else {
              const anchorPosition = expectedOrder.indexOf(afterPageId);
              expectedOrder.splice(anchorPosition + 1, 0, targetId);
            }
          }
          const orderedPages = [...document.pages].sort(comparePosition);
          const positions = orderedPages.map((page) => page.position);

          expect(new Set(positions).size).toBe(document.pages.length);
          expect(orderedPages.map((page) => page.id)).toEqual(expectedOrder);
        },
      ),
    );
  });
});

function roundTrip(document: BrandDocument, command: unknown): void {
  const frozenDocument = deepFreeze(document);
  const frozenCommand = deepFreeze(command);
  const applied = apply(frozenDocument, frozenCommand);
  expect(applied.ok).toBe(true);
  if (!applied.ok) {
    return;
  }
  // ADR-018: every inverse carries the value its command just wrote.
  expect(Object.hasOwn(applied.value.inverse, 'expect')).toBe(true);

  const restored = applyInverse(deepFreeze(applied.value.doc), deepFreeze(applied.value.inverse));
  expect(restored.ok).toBe(true);
  if (restored.ok) {
    expect(restored.value.doc).toEqual(document);
  }
}

function withText(document: BrandDocument, brandName: string, pageTitle: string): BrandDocument {
  return {
    ...document,
    brand: { ...document.brand, name: brandName },
    pages: document.pages.map((page, index) =>
      index === 0 ? { ...page, title: pageTitle } : page,
    ),
  };
}

function withoutMockup(document: BrandDocument): BrandDocument {
  return {
    ...document,
    pages: document.pages.map((page) =>
      page.id === 'page-mockup' ? { ...page, data: { caption: 'Scène actuelle' } } : page,
    ),
  };
}

function comparePosition(
  left: BrandDocument['pages'][number],
  right: BrandDocument['pages'][number],
): number {
  return left.position < right.position ? -1 : left.position > right.position ? 1 : 0;
}
