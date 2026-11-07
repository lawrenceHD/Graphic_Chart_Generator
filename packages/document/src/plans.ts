import type { ChartPlan, PageType } from '@app/contracts';

// The 16-page charter, built only from the 11 existing page types: a palette page per dominant colour,
// a do/don't page per usage, a typography page for headings and one for text, a mockup page per scene.
// Titles are generic labels; a research plan (packages/ai) replaces them with brand-specific ones.
const STANDARD_SECTIONS: readonly (readonly [PageType, string, string])[] = [
  ['cover', 'Couverture', 'Cover'],
  ['manifesto', 'Manifeste', 'Manifesto'],
  ['logo', 'Logo', 'Logo'],
  ['clear-space', "Zone d'exclusion", 'Clear space'],
  ['palette', 'Palette : couleur principale', 'Palette: primary colour'],
  ['palette', "Palette : couleur d'accent", 'Palette: accent colour'],
  ['palette', 'Palette : neutres', 'Palette: neutrals'],
  ['contrast', 'Contrastes', 'Contrast'],
  ['do-dont', 'À faire, à éviter : logo', "Do's and don'ts: logo"],
  ['do-dont', 'À faire, à éviter : couleurs', "Do's and don'ts: colours"],
  ['typography', 'Typographie : titres', 'Typography: headings'],
  ['typography', 'Typographie : textes', 'Typography: body text'],
  ['tone-of-voice', 'Ton de voix', 'Tone of voice'],
  ['mockup', 'Mockup : supports imprimés', 'Mockup: print'],
  ['mockup', 'Mockup : supports numériques', 'Mockup: digital'],
  ['tokens', 'Tokens', 'Tokens'],
];

export function standardChartPlan(language: 'fr' | 'en'): ChartPlan {
  return {
    sections: STANDARD_SECTIONS.map(([type, fr, en]) => ({
      type,
      title: language === 'fr' ? fr : en,
      evidence: [],
    })),
  };
}
