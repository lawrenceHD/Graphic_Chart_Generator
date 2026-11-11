import { ChartPlanSchema, GUIDELINE_SECTIONS, PAGE_TYPES, type PageType } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildArtDirection, type ArtDirection } from '../references/direction.js';
import { direction as axis, reference } from '../references/fixtures.js';
import { rankReferences } from '../references/rank.js';
import {
  defaultChartPlan,
  directionToChartPlan,
  capSections,
  FALLBACK_CHART_PLAN,
  PAGE_CAPACITY,
  planFromSections,
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

describe('PAGE_CAPACITY', () => {
  it('pins the content capacities of the studio pages (apps/web/src/studio/pages)', () => {
    expect(PAGE_CAPACITY).toEqual({
      cover: 1,
      manifesto: 4,
      logo: 4,
      'clear-space': 3,
      'do-dont': 16,
      palette: 12,
      contrast: 2,
      typography: 11,
      'tone-of-voice': 1,
      mockup: 13,
      tokens: 1,
    });
  });

  it('is never exceeded by the sections the mapping can send to a type', () => {
    for (const type of PAGE_TYPES) {
      const count = GUIDELINE_SECTIONS.filter((section) => SECTION_PAGE_TYPE[section] === type);
      expect(count.length, type).toBeLessThanOrEqual(PAGE_CAPACITY[type]);
    }
  });
});

describe('capSections', () => {
  const make = (type: PageType, title: string, evidence: number) => ({
    type,
    title,
    evidence: Array.from({ length: evidence }, (_, index) => `${title}-${String(index)}`),
  });

  it('keeps at most 13 mockup pages, the best supported, in the original order', () => {
    const sections = Array.from({ length: 16 }, (_, index) =>
      make('mockup', `m${String(index)}`, index < 3 ? 0 : 1),
    );
    const { sections: kept, dropped } = capSections(sections);
    expect(kept).toHaveLength(13);
    expect(dropped).toBe(3);
    expect(kept.map((section) => section.title)).toEqual(
      sections.slice(3).map((section) => section.title),
    );
  });

  it('gives 4 manifesto pages out of 5 and drops the weakest', () => {
    const sections = [
      make('manifesto', 'a', 1),
      make('manifesto', 'b', 0),
      make('logo', 'l', 0),
      make('manifesto', 'c', 3),
      make('manifesto', 'd', 2),
      make('manifesto', 'e', 1),
    ];
    const { sections: kept, dropped } = capSections(sections);
    expect(kept.map((section) => section.title)).toEqual(['a', 'l', 'c', 'd', 'e']);
    expect(dropped).toBe(1);
  });

  it('leaves tokens last and the plan valid', () => {
    const sections = [
      ...Array.from({ length: 6 }, (_, i) => make('manifesto', `x${String(i)}`, 1)),
    ];
    const { plan, capped } = planFromSections([...sections, make('tokens', 'T', 0)]);
    expect(capped).toBe(2);
    expect(plan.sections.at(-1)?.type).toBe('tokens');
    expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('tokens page', () => {
  it('ends every plan, researched, default or last resort, like the standard plan', () => {
    for (const plan of [directionToChartPlan(art), defaultChartPlan(), FALLBACK_CHART_PLAN]) {
      expect(plan.sections.at(-1)?.type).toBe('tokens');
      expect(plan.sections.filter((section) => section.type === 'tokens')).toHaveLength(1);
    }
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
    expect(plan.sections).toEqual([
      { type: 'mockup', title: 'Menu and cards', evidence: ['a'] },
      { type: 'tokens', title: 'Design tokens', evidence: [] },
    ]);
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

describe('titles in the language of the project', () => {
  it('keeps English titles by default', () => {
    expect(defaultChartPlan().sections.map((section) => section.title)).toContain('Colour palette');
  });

  it('writes every title in French for a French project, the tokens page and the last resort included', () => {
    const english = directionToChartPlan(art, 'en');
    const french = directionToChartPlan(art, 'fr');
    expect(french.sections.map((section) => section.type)).toEqual(
      english.sections.map((section) => section.type),
    );
    expect(french.sections.map((section) => section.title)).toContain('Menu et cartes');
    expect(defaultChartPlan('fr').sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Couverture',
        'Palette de couleurs',
        'Typographie',
        'Tokens de design',
      ]),
    );
    expect(planFromDirection({ sections: [] }, 'fr').plan).toEqual(defaultChartPlan('fr'));
    expect(ChartPlanSchema.safeParse(french).success).toBe(true);
  });

  it('has a French title for each of the guideline sections', () => {
    for (const section of GUIDELINE_SECTIONS) {
      const plan = directionToChartPlan(
        { sections: [{ section, core: false, support: 1, evidence: [] }] },
        'fr',
      );
      expect(plan.sections[0]?.title.length).toBeGreaterThan(0);
      expect(ChartPlanSchema.safeParse(plan).success).toBe(true);
    }
    const titles = (language: 'fr' | 'en') =>
      GUIDELINE_SECTIONS.map(
        (section) =>
          directionToChartPlan(
            { sections: [{ section, core: false, support: 1, evidence: [] }] },
            language,
          ).sections[0]?.title,
      );
    // Same word in both languages: Typography/Typographie differ, Illustration and Menu… do not all.
    const same = titles('fr').filter((title, index) => title === titles('en')[index]);
    expect(same).toEqual(['Illustration']);
  });
});
