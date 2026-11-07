import {
  ChartPlanSchema,
  MAX_SECTION_EVIDENCE,
  PAGE_CAPACITY,
  type ChartPlan,
  type GuidelineSection,
  PAGE_TYPES,
  type PageType,
} from '@app/contracts';
import { buildArtDirection, type ArtDirection } from '../references/direction.js';

// The research speaks in 30 guideline sections; the document knows 11 page types (packages/contracts).
// Several sections may share a type: the plan then holds several pages of that type, each with its own title.
// 'tokens' is no guideline section: buildPlan appends that page last, as the standard plan does.
// 'contrast' comes from 'color-ratio' only. That section is not in the common core (references/direction.ts):
// it joins the plan when at least a quarter of the closest references show it, like any sector section.
export const SECTION_PAGE_TYPE: Record<GuidelineSection, PageType> = {
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
};

const TITLES: Record<GuidelineSection, string> = {
  cover: 'Cover',
  contents: 'Contents',
  'brand-story': 'Brand story',
  values: 'Values',
  logo: 'The logo',
  'logo-construction': 'Logo construction',
  'logo-variants': 'Logo variants',
  'clear-space': 'Clear space',
  'minimum-size': 'Minimum size',
  misuse: 'Logo misuse',
  palette: 'Colour palette',
  'color-ratio': 'Colour proportions',
  typography: 'Typography',
  'type-hierarchy': 'Type hierarchy',
  iconography: 'Iconography',
  pattern: 'Patterns',
  photography: 'Photography',
  illustration: 'Illustration',
  'grid-layout': 'Grid and layout',
  stationery: 'Stationery',
  packaging: 'Packaging',
  signage: 'Signage',
  'social-media': 'Social media',
  website: 'Website',
  merchandise: 'Merchandise',
  uniform: 'Uniforms',
  vehicle: 'Vehicles',
  menu: 'Menu and cards',
  'tone-of-voice': 'Tone of voice',
  closing: 'Closing',
};

const TITLE_MAX = 80;
const EVIDENCE_MAX = 64;

// Evidence ids come from the index file: kept only if the contract would accept them.
function cleanEvidence(evidence: readonly string[]): string[] {
  return evidence
    .map((id) => id.normalize('NFC').slice(0, EVIDENCE_MAX))
    .filter((id) => id.length > 0 && !/<[A-Za-z/!]/u.test(id))
    .slice(0, MAX_SECTION_EVIDENCE);
}

const tokensSection = (): ChartPlan['sections'][number] => ({
  type: 'tokens',
  title: 'Design tokens',
  evidence: [],
});

// The table lives in packages/contracts; re-exported so the importers of this module do not change.
export { PAGE_CAPACITY };

type PlanSection = ChartPlan['sections'][number];

/** Keeps, per page type, the best supported sections up to the capacity; the order is unchanged. */
export function capSections(sections: readonly PlanSection[]): {
  sections: PlanSection[];
  dropped: number;
} {
  const dropped = new Set<number>();
  for (const type of PAGE_TYPES) {
    const ranked = sections
      .map((section, index) => ({ section, index }))
      .filter((entry) => entry.section.type === type)
      .sort((a, b) => b.section.evidence.length - a.section.evidence.length || a.index - b.index);
    for (const entry of ranked.slice(PAGE_CAPACITY[type])) dropped.add(entry.index);
  }
  return {
    sections: sections.filter((_, index) => !dropped.has(index)),
    dropped: dropped.size,
  };
}

/** Caps the sections, then ends the plan with the tokens page. */
export function planFromSections(sections: readonly PlanSection[]): {
  plan: ChartPlan;
  capped: number;
} {
  const capped = capSections(sections.filter((section) => section.type !== 'tokens'));
  const tokens = sections.find((section) => section.type === 'tokens') ?? tokensSection();
  return { plan: { sections: [...capped.sections, tokens] }, capped: capped.dropped };
}

function buildPlan(
  direction: Pick<ArtDirection, 'sections'>,
): { plan: ChartPlan; capped: number } | undefined {
  const seen = new Set<GuidelineSection>();
  const sections: PlanSection[] = [];
  for (const planned of direction.sections) {
    if (seen.has(planned.section)) continue;
    seen.add(planned.section);
    sections.push({
      type: SECTION_PAGE_TYPE[planned.section],
      title: TITLES[planned.section].slice(0, TITLE_MAX),
      evidence: cleanEvidence(planned.evidence),
    });
  }
  if (sections.length === 0) return undefined;
  const built = planFromSections(sections);
  const parsed = ChartPlanSchema.safeParse(built.plan);
  return parsed.success ? { plan: parsed.data, capped: built.capped } : undefined;
}

// Last resort, fixed and tested against the contract: reached only if the common core itself is refused.
export const FALLBACK_CHART_PLAN: ChartPlan = {
  sections: [
    { type: 'cover', title: 'Cover', evidence: [] },
    { type: 'logo', title: 'The logo', evidence: [] },
    { type: 'palette', title: 'Colour palette', evidence: [] },
    { type: 'typography', title: 'Typography', evidence: [] },
    tokensSection(),
  ],
};

/** The sections every professional guideline contains: used when no sourced direction is available. */
export function defaultChartPlan(): ChartPlan {
  return buildPlan(buildArtDirection([]))?.plan ?? FALLBACK_CHART_PLAN;
}

/** Never throws: an empty or refused plan becomes the default plan, flagged as degraded. */
export function planFromDirection(direction: Pick<ArtDirection, 'sections'>): {
  plan: ChartPlan;
  degraded: boolean;
  // Sections left out because their page type was full (PAGE_CAPACITY).
  capped: number;
} {
  const built = buildPlan(direction);
  return built
    ? { plan: built.plan, degraded: false, capped: built.capped }
    : { plan: defaultChartPlan(), degraded: true, capped: 0 };
}

/** Converts a sourced art direction into the contract's page plan, in guideline order, evidence kept. */
export function directionToChartPlan(direction: Pick<ArtDirection, 'sections'>): ChartPlan {
  return planFromDirection(direction).plan;
}
