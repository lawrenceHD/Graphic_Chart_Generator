import { describe, expect, it } from 'vitest';
import { ChartPlanSchema, MAX_CHART_SECTIONS } from './index.js';

const section = { type: 'palette', title: 'Palette principale', evidence: ['ref-1', 'ref-2'] };

describe('ChartPlanSchema', () => {
  it('accepts an ordered list of sections of known page types', () => {
    const parsed = ChartPlanSchema.safeParse({
      sections: [{ type: 'cover', title: 'Couverture', evidence: [] }, section],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.sections.map((item) => item.type)).toEqual([
      'cover',
      'palette',
    ]);
  });

  it('refuses an empty plan, an unknown type, unknown keys and an empty title', () => {
    expect(ChartPlanSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(ChartPlanSchema.safeParse({ sections: [{ ...section, type: 'colors' }] }).success).toBe(
      false,
    );
    expect(ChartPlanSchema.safeParse({ sections: [{ ...section, extra: 1 }] }).success).toBe(false);
    expect(ChartPlanSchema.safeParse({ sections: [{ ...section, title: '' }] }).success).toBe(
      false,
    );
  });

  it('bounds the number of sections, of evidences and the text content', () => {
    const many = Array.from({ length: MAX_CHART_SECTIONS + 1 }, () => section);
    expect(ChartPlanSchema.safeParse({ sections: many }).success).toBe(false);
    const evidence = Array.from({ length: 21 }, (_, index) => `r${String(index)}`);
    expect(ChartPlanSchema.safeParse({ sections: [{ ...section, evidence }] }).success).toBe(false);
    expect(
      ChartPlanSchema.safeParse({ sections: [{ ...section, title: '<b>x</b>' }] }).success,
    ).toBe(false);
  });
});
