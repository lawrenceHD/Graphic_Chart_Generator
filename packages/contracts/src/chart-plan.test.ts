import { describe, expect, it } from 'vitest';
import { ChartPlanSchema, MAX_CHART_SECTIONS, PAGE_CAPACITY, PAGE_TYPES } from './index.js';

describe('PAGE_CAPACITY', () => {
  it('has a positive integer capacity for every page type and no other key', () => {
    expect(Object.keys(PAGE_CAPACITY).sort()).toEqual([...PAGE_TYPES].sort());
    for (const type of PAGE_TYPES) {
      expect(Number.isInteger(PAGE_CAPACITY[type]), type).toBe(true);
      expect(PAGE_CAPACITY[type], type).toBeGreaterThan(0);
    }
  });

  it('refuses a plan with more sections of a type than its capacity', () => {
    const sections = (count: number) =>
      Array.from({ length: count }, () => ({ type: 'cover', title: 'C', evidence: [] }));
    expect(ChartPlanSchema.safeParse({ sections: sections(PAGE_CAPACITY.cover) }).success).toBe(
      true,
    );
    expect(ChartPlanSchema.safeParse({ sections: sections(PAGE_CAPACITY.cover + 1) }).success).toBe(
      false,
    );
  });
});

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
