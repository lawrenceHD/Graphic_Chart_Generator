import { describe, expect, it } from 'vitest';
import { BrandDocumentSchema, PageSchema } from './schema.js';
import { makeDocument } from './test-fixtures.js';

describe('BrandDocument schema', () => {
  it('accepts a complete version 1 document', () => {
    expect(BrandDocumentSchema.safeParse(makeDocument()).success).toBe(true);
  });

  it('rejects incomplete, duplicate, or out-of-range tone axes', () => {
    const document = makeDocument();
    const firstAxis = document.brand.tone.axes.find((axis) => axis.id === 'formal-casual');
    if (!firstAxis) {
      throw new Error('The fixture must include the formal-casual axis.');
    }

    const shortAxes = {
      ...document,
      brand: {
        ...document.brand,
        tone: { ...document.brand.tone, axes: document.brand.tone.axes.slice(0, 3) },
      },
    };
    const duplicateAxes = {
      ...document,
      brand: {
        ...document.brand,
        tone: {
          ...document.brand.tone,
          axes: document.brand.tone.axes.map((axis, index) =>
            index === 3 ? { ...axis, id: firstAxis.id } : axis,
          ),
        },
      },
    };
    const highAxisValue = {
      ...document,
      brand: {
        ...document.brand,
        tone: {
          ...document.brand.tone,
          axes: document.brand.tone.axes.map((axis) =>
            axis.id === 'formal-casual' ? { ...axis, value: 101 } : axis,
          ),
        },
      },
    };

    expect(BrandDocumentSchema.safeParse(shortAxes).success).toBe(false);
    expect(BrandDocumentSchema.safeParse(duplicateAxes).success).toBe(false);
    expect(BrandDocumentSchema.safeParse(highAxisValue).success).toBe(false);
  });

  it('rejects duplicate variant kinds and fidelity outside the score range', () => {
    const document = makeDocument();
    const duplicateKind = {
      ...document,
      assets: {
        ...document.assets,
        variants: [
          ...document.assets.variants,
          { assetId: 'logo-color-2', kind: 'color', needsReview: true },
        ],
      },
    };
    const invalidFidelity = {
      ...document,
      assets: {
        ...document.assets,
        variants: document.assets.variants.map((variant) => ({ ...variant, fidelity: 1.2 })),
      },
    };

    expect(BrandDocumentSchema.safeParse(duplicateKind).success).toBe(false);
    expect(BrandDocumentSchema.safeParse(invalidFidelity).success).toBe(false);
  });

  it('rejects dangerous data keys and values that are not JSON serializable', () => {
    const page = makeDocument().pages[0];
    if (!page) {
      throw new Error('The fixture must include a page.');
    }
    const dataWithDangerousKey: Record<string, unknown> = { ...page.data };
    Object.defineProperty(dataWithDangerousKey, '__proto__', {
      value: 'blocked',
      enumerable: true,
    });

    expect(PageSchema.safeParse({ ...page, data: dataWithDangerousKey }).success).toBe(false);
    expect(PageSchema.safeParse({ ...page, data: { unset: undefined } }).success).toBe(false);
    expect(
      PageSchema.safeParse({ ...page, data: { infinite: Number.POSITIVE_INFINITY } }).success,
    ).toBe(false);
    expect(PageSchema.safeParse({ ...page, data: { bigint: 1n } }).success).toBe(false);
  });

  it('rejects a document larger than 512 KiB after UTF-8 JSON serialization', () => {
    const document = makeDocument();
    const page = document.pages.find((entry) => entry.id === 'page-cover');
    if (!page) {
      throw new Error('The fixture must include its cover page.');
    }
    const data: Record<string, unknown> = {};
    for (let index = 0; index < 270; index += 1) {
      data[`field-${String(index)}`] = 'x'.repeat(2000);
    }
    page.data = data;

    expect(BrandDocumentSchema.safeParse(document).success).toBe(false);
  });
});
