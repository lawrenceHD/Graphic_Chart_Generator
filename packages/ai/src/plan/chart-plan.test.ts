import { ChartPlanSchema, GUIDELINE_SECTIONS, PAGE_TYPES } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildArtDirection, type ArtDirection } from '../references/direction.js';
import { direction as axis, reference } from '../references/fixtures.js';
import { rankReferences } from '../references/rank.js';
import { defaultChartPlan, directionToChartPlan, SECTION_PAGE_TYPE } from './chart-plan.js';

const library = [
  reference('menu-1', 'restaurant', axis(0), { sections: ['menu', 'signage'] }),
  reference('menu-2', 'restaurant', axis(1), { sections: ['menu'] }),
];
const art = buildArtDirection(
  rankReferences({ sector: 'restaurant', styles: ['minimal'], palette: [] }, library, {
    limit: 12,
  }),
);

describe('SECTION_PAGE_TYPE', () => {
  it('maps every guideline section to one of the page types', () => {
    for (const section of GUIDELINE_SECTIONS) {
      expect(PAGE_TYPES).toContain(SECTION_PAGE_TYPE[section]);
    }
    expect(Object.keys(SECTION_PAGE_TYPE).sort()).toEqual([...GUIDELINE_SECTIONS].sort());
  });
});

describe('directionToChartPlan', () => {
  it('yields a plan valid for the contract, with sector sections as mockup pages', () => {
    const plan = directionToChartPlan(art);
    expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.sections[0]?.type).toBe('cover');
    const menu = plan.sections.find((section) => section.title === 'Menu and cards');
    expect(menu).toEqual({
      type: 'mockup',
      title: 'Menu and cards',
      evidence: ['menu-1', 'menu-2'],
    });
  });

  it('allows several pages of the same type', () => {
    const types = directionToChartPlan(art).sections.map((section) => section.type);
    expect(types.filter((type) => type === 'mockup').length).toBeGreaterThan(1);
  });

  it('truncates and filters evidence so the plan always passes the contract', () => {
    const noisy: Pick<ArtDirection, 'sections'> = {
      sections: [
        {
          section: 'menu',
          core: false,
          support: 1,
          evidence: [
            'x'.repeat(100),
            '',
            '<b>tag',
            ...Array.from({ length: 30 }, (_, index) => `ref-${String(index)}`),
          ],
        },
      ],
    };
    const plan = directionToChartPlan(noisy);
    expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.sections[0]?.evidence).toHaveLength(20);
    expect(plan.sections[0]?.evidence[0]).toBe('x'.repeat(64));
  });
});

describe('defaultChartPlan', () => {
  it('is the common core of professional guidelines, valid, without evidence', () => {
    const plan = defaultChartPlan();
    expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.sections.map((section) => section.title)).toContain('Typography');
    for (const section of plan.sections) expect(section.evidence).toEqual([]);
  });
});
