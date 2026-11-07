import { describe, expect, it } from 'vitest';
import { buildArtDirection } from '../references/direction.js';
import { direction as axis, reference } from '../references/fixtures.js';
import { rankReferences } from '../references/rank.js';
import { defaultChartPlan, directionToChartPlan } from './chart-plan.js';

const library = [
  reference('menu-1', 'restaurant', axis(0), { sections: ['menu', 'signage'] }),
  reference('menu-2', 'restaurant', axis(1), { sections: ['menu'] }),
];
const art = buildArtDirection(
  rankReferences({ sector: 'restaurant', styles: ['minimal'], palette: [] }, library, {
    limit: 12,
  }),
);

describe('directionToChartPlan', () => {
  it('maps each planned section to a titled entry carrying its reference evidence', () => {
    const plan = directionToChartPlan(art, 'fr');
    const menu = plan.sections.find((section) => section.type === 'menu');
    expect(menu).toEqual({ type: 'menu', titre: 'Carte et menus', preuves: ['menu-1', 'menu-2'] });
    expect(plan.sections[0]?.type).toBe('cover');
    expect(plan.sections.at(-1)?.type).toBe('closing');
  });

  it('titles in English on request and never duplicates a type', () => {
    const plan = directionToChartPlan(art, 'en');
    expect(plan.sections.find((section) => section.type === 'menu')?.titre).toBe('Menu and cards');
    const types = plan.sections.map((section) => section.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('defaultChartPlan', () => {
  it('is the common core of professional guidelines, without evidence', () => {
    const plan = defaultChartPlan('fr');
    expect(plan.sections.map((section) => section.type)).toEqual([
      'cover',
      'contents',
      'brand-story',
      'logo',
      'logo-variants',
      'clear-space',
      'minimum-size',
      'misuse',
      'palette',
      'typography',
      'closing',
    ]);
    for (const section of plan.sections) expect(section.preuves).toEqual([]);
  });
});
