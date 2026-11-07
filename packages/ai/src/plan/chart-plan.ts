import type { GuidelineSection } from '@app/contracts';
import { buildArtDirection, type ArtDirection } from '../references/direction.js';

// Local, structurally identical copy of the ChartPlan R1 defines in packages/contracts (docs/team/QUEUE.md):
// once it exists, this interface is replaced by the contract type, with no change to the callers.
export interface ChartPlanDraftSection {
  type: GuidelineSection;
  titre: string;
  // Ids of the library references that justify the section (empty for the default plan).
  preuves: string[];
}
export interface ChartPlanDraft {
  sections: ChartPlanDraftSection[];
}

export type PlanLanguage = 'fr' | 'en';

const TITLES: Record<GuidelineSection, readonly [fr: string, en: string]> = {
  cover: ['Couverture', 'Cover'],
  contents: ['Sommaire', 'Contents'],
  'brand-story': ['Histoire de la marque', 'Brand story'],
  values: ['Valeurs', 'Values'],
  logo: ['Le logo', 'The logo'],
  'logo-construction': ['Construction du logo', 'Logo construction'],
  'logo-variants': ['Déclinaisons du logo', 'Logo variants'],
  'clear-space': ['Zone de protection', 'Clear space'],
  'minimum-size': ['Taille minimale', 'Minimum size'],
  misuse: ['Usages interdits', 'Logo misuse'],
  palette: ['Palette de couleurs', 'Colour palette'],
  'color-ratio': ['Proportions des couleurs', 'Colour proportions'],
  typography: ['Typographie', 'Typography'],
  'type-hierarchy': ['Hiérarchie typographique', 'Type hierarchy'],
  iconography: ['Iconographie', 'Iconography'],
  pattern: ['Motifs', 'Patterns'],
  photography: ['Photographie', 'Photography'],
  illustration: ['Illustration', 'Illustration'],
  'grid-layout': ['Grille et mise en page', 'Grid and layout'],
  stationery: ['Papeterie', 'Stationery'],
  packaging: ['Emballages', 'Packaging'],
  signage: ['Signalétique', 'Signage'],
  'social-media': ['Réseaux sociaux', 'Social media'],
  website: ['Site web', 'Website'],
  merchandise: ['Objets dérivés', 'Merchandise'],
  uniform: ['Tenues', 'Uniforms'],
  vehicle: ['Véhicules', 'Vehicles'],
  menu: ['Carte et menus', 'Menu and cards'],
  'tone-of-voice': ['Ton de voix', 'Tone of voice'],
  closing: ['Clôture', 'Closing'],
};

const title = (section: GuidelineSection, language: PlanLanguage): string =>
  TITLES[section][language === 'fr' ? 0 : 1];

/** Converts a sourced art direction into the page plan, in guideline order, evidence kept. */
export function directionToChartPlan(
  direction: Pick<ArtDirection, 'sections'>,
  language: PlanLanguage,
): ChartPlanDraft {
  const seen = new Set<GuidelineSection>();
  const sections: ChartPlanDraftSection[] = [];
  for (const planned of direction.sections) {
    if (seen.has(planned.section)) continue;
    seen.add(planned.section);
    sections.push({
      type: planned.section,
      titre: title(planned.section, language),
      preuves: [...planned.evidence],
    });
  }
  return { sections };
}

/** The sections every professional guideline contains: used when no sourced direction is available. */
export function defaultChartPlan(language: PlanLanguage): ChartPlanDraft {
  return directionToChartPlan(buildArtDirection([]), language);
}
