import {
  GUIDELINE_SECTIONS,
  type GuidelineSection,
  type TypeStyle,
  type VisualStyle,
} from '@app/contracts';
import { canonicalMockup } from './mockups.js';
import type { RankedReference } from './rank.js';

// Sections every professional guideline of the owner's corpus contains, whatever the sector.
const CORE_SECTIONS: readonly GuidelineSection[] = [
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
];
// A sector section joins the plan when at least this share of the closest references shows it.
const SECTION_SUPPORT = 0.25;
const MOCKUP_LIMIT = 8;
const INSIGHT_LIMIT = 5;

export interface PlannedSection {
  section: GuidelineSection;
  core: boolean;
  // Share (0 to 1, weighted by relevance) of the selected references that show this section.
  support: number;
  evidence: string[];
}

export interface PlannedMockup {
  subject: string;
  support: number;
  evidence: string[];
}

export interface ArtDirection {
  sections: PlannedSection[];
  mockups: PlannedMockup[];
  styles: { style: VisualStyle; weight: number }[];
  typography: { heading?: TypeStyle; body?: TypeStyle };
  layout: { whitespace?: string; background?: string };
  insights: { text: string; evidence: string }[];
  references: { id: string; file: string; score: number }[];
}

interface Tally {
  weight: number;
  evidence: string[];
}

function tally<K>(
  ranked: readonly RankedReference[],
  keys: (entry: RankedReference) => readonly K[],
) {
  const totals = new Map<K, Tally>();
  for (const entry of ranked) {
    for (const key of new Set(keys(entry))) {
      const current = totals.get(key) ?? { weight: 0, evidence: [] };
      current.weight += entry.score;
      current.evidence.push(entry.reference.id);
      totals.set(key, current);
    }
  }
  return totals;
}

function winner<K>(totals: Map<K, Tally>, exclude?: K): K | undefined {
  let best: K | undefined;
  let bestWeight = 0;
  for (const [key, { weight }] of totals) {
    if (key !== exclude && weight > bestWeight) {
      best = key;
      bestWeight = weight;
    }
  }
  return best;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function buildArtDirection(ranked: readonly RankedReference[]): ArtDirection {
  const totalWeight = ranked.reduce((sum, entry) => sum + entry.score, 0);
  const share = (weight: number): number => (totalWeight === 0 ? 0 : round(weight / totalWeight));

  const sectionTally = tally(ranked, (entry) => entry.reference.card.sections);
  const sections = GUIDELINE_SECTIONS.flatMap((section): PlannedSection[] => {
    const found = sectionTally.get(section);
    const support = share(found?.weight ?? 0);
    const core = CORE_SECTIONS.includes(section);
    if (!core && support < SECTION_SUPPORT) return [];
    return [{ section, core, support, evidence: found?.evidence ?? [] }];
  });

  const mockups = [...tally(ranked, (entry) => entry.reference.card.mockups.map(canonicalMockup))]
    .map(([subject, found]) => ({
      subject,
      support: share(found.weight),
      evidence: found.evidence,
    }))
    .sort((a, b) => b.support - a.support || a.subject.localeCompare(b.subject))
    .slice(0, MOCKUP_LIMIT);

  const styles = [...tally(ranked, (entry) => entry.reference.card.styles)]
    .map(([style, found]) => ({ style, weight: share(found.weight) }))
    .sort((a, b) => b.weight - a.weight || a.style.localeCompare(b.style));

  const heading = winner(
    tally(ranked, (entry) => [entry.reference.card.headingType]),
    'none',
  );
  const body = winner(
    tally(ranked, (entry) => [entry.reference.card.bodyType]),
    'none',
  );
  const whitespace = winner(tally(ranked, (entry) => [entry.reference.card.whitespace]));
  const background = winner(tally(ranked, (entry) => [entry.reference.card.background]));

  return {
    sections,
    mockups,
    styles,
    typography: { ...(heading ? { heading } : {}), ...(body ? { body } : {}) },
    layout: { ...(whitespace ? { whitespace } : {}), ...(background ? { background } : {}) },
    insights: ranked
      .filter((entry) => entry.reference.card.insight.length > 0)
      .slice(0, INSIGHT_LIMIT)
      .map((entry) => ({ text: entry.reference.card.insight, evidence: entry.reference.id })),
    references: ranked.map((entry) => ({
      id: entry.reference.id,
      file: entry.reference.file,
      score: round(entry.score),
    })),
  };
}
