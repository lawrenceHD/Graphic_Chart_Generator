import {
  ChartPlanSchema,
  MAX_SECTION_EVIDENCE,
  type ChartPlan,
  type GuidelineSection,
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

function buildPlan(direction: Pick<ArtDirection, 'sections'>): ChartPlan | undefined {
  const seen = new Set<GuidelineSection>();
  const sections: ChartPlan['sections'] = [];
  for (const planned of direction.sections) {
    if (seen.has(planned.section)) continue;
    seen.add(planned.section);
    sections.push({
      type: SECTION_PAGE_TYPE[planned.section],
      title: TITLES[planned.section].slice(0, TITLE_MAX),
      evidence: cleanEvidence(planned.evidence),
    });
  }
  if (sections.length > 0) sections.push(tokensSection());
  const parsed = ChartPlanSchema.safeParse({ sections });
  return parsed.success ? parsed.data : undefined;
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
  return buildPlan(buildArtDirection([])) ?? FALLBACK_CHART_PLAN;
}

/** Never throws: an empty or refused plan becomes the default plan, flagged as degraded. */
export function planFromDirection(direction: Pick<ArtDirection, 'sections'>): {
  plan: ChartPlan;
  degraded: boolean;
} {
  const plan = buildPlan(direction);
  return plan ? { plan, degraded: false } : { plan: defaultChartPlan(), degraded: true };
}

/** Converts a sourced art direction into the contract's page plan, in guideline order, evidence kept. */
export function directionToChartPlan(direction: Pick<ArtDirection, 'sections'>): ChartPlan {
  return planFromDirection(direction).plan;
}
