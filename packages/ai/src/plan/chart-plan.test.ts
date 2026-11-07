import { ChartPlanSchema, GUIDELINE_SECTIONS, PAGE_TYPES } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildArtDirection, type ArtDirection } from '../references/direction.js';
import { direction as axis, reference } from '../references/fixtures.js';
import { rankReferences } from '../references/rank.js';
import {
  defaultChartPlan,
  directionToChartPlan,
  FALLBACK_CHART_PLAN,
  planFromDirection,
  SECTION_PAGE_TYPE,
} from './chart-plan.js';

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

describe('never throws', () => {
  const planned = (section: 'menu', evidence: string[]) => ({
    section,
    core: false,
    support: 1,
    evidence,
  });

  it('falls back to the default plan for an empty direction, and says so', () => {
    expect(directionToChartPlan({ sections: [] })).toEqual(defaultChartPlan());
    expect(planFromDirection({ sections: [] }).degraded).toBe(true);
  });

  it('keeps a plan made of duplicated sections only, once', () => {
    const duplicated = { sections: [planned('menu', ['a']), planned('menu', ['b'])] };
    const { plan, degraded } = planFromDirection(duplicated);
    expect(degraded).toBe(false);
    expect(plan.sections).toEqual([{ type: 'mockup', title: 'Menu and cards', evidence: ['a'] }]);
  });

  it('survives evidence that is entirely invalid', () => {
    const { plan, degraded } = planFromDirection({
      sections: [planned('menu', ['', '<b>x', '<script'])],
    });
    expect(degraded).toBe(false);
    expect(plan.sections[0]?.evidence).toEqual([]);
    expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('has a frozen last-resort plan valid for the contract', () => {
    expect(ChartPlanSchema.safeParse(FALLBACK_CHART_PLAN).success).toBe(true);
  });
});

describe('SECTION_PAGE_TYPE table', () => {
  it('is exactly the documented mapping', () => {
    expect(SECTION_PAGE_TYPE).toEqual({
      cover: 'cover',
      contents: 'manifesto',
      'brand-story': 'manifesto',
      values: 'manifesto',
      logo: 'logo',
      'logo-construction': 'logo',
      'logo-variants': 'logo',
      'clear-space': 'clear-space',
      'minimum-size': 'clear-space',
      misuse: 'do-dont',
      palette: 'palette',
      'color-ratio': 'contrast',
      typography: 'typography',
      'type-hierarchy': 'typography',
      iconography: 'logo',
      pattern: 'mockup',
      photography: 'mockup',
      illustration: 'mockup',
      'grid-layout': 'typography',
      stationery: 'mockup',
      packaging: 'mockup',
      signage: 'mockup',
      'social-media': 'mockup',
      website: 'mockup',
      merchandise: 'mockup',
      uniform: 'mockup',
      vehicle: 'mockup',
      menu: 'mockup',
      'tone-of-voice': 'tone-of-voice',
      closing: 'manifesto',
    });
  });
});
