import type { PageType } from './document-types.js';
import type { GuidelineSection } from './reference.js';

// The minimum set of dense pages of a charter (docs/research/2026-11-11-contenu-des-chartes.md §3, ADR-035):
// one page per subject, each holding every rule of that subject. A short charter stacks its specifications
// on the page instead of splitting them over thin pages.
export interface DensePage {
  readonly section: GuidelineSection;
  readonly type: PageType;
  readonly title: { readonly fr: string; readonly en: string };
}

const page = (section: GuidelineSection, type: PageType, fr: string, en: string): DensePage => ({
  section,
  type,
  title: { fr, en },
});

export const DENSE_PAGES: readonly DensePage[] = [
  page('cover', 'cover', 'Couverture', 'Cover'),
  page('contents', 'manifesto', 'Sommaire et mode d’emploi', 'Contents and how to use'),
  page('brand-story', 'manifesto', 'Plateforme de marque', 'Brand platform'),
  page('tone-of-voice', 'tone-of-voice', 'Ton de voix', 'Tone of voice'),
  page('logo', 'logo', 'Logo : anatomie et construction', 'Logo: anatomy and construction'),
  page('logo-variants', 'logo', 'Logo : versions et fonds', 'Logo: versions and backgrounds'),
  page(
    'clear-space',
    'clear-space',
    'Protection et tailles minimales',
    'Clear space and minimum sizes',
  ),
  page('misuse', 'do-dont', 'Usages interdits', 'Logo misuse'),
  page('palette', 'palette', 'Couleurs : valeurs et rôles', 'Colours: values and roles'),
  page('color-ratio', 'contrast', 'Couleurs : contrastes', 'Colours: contrast'),
  page('typography', 'typography', 'Typographie : familles', 'Typography: families'),
  page('type-hierarchy', 'typography', 'Hiérarchie typographique', 'Type hierarchy'),
  page('pattern', 'mockup', 'Langage visuel', 'Visual language'),
  page('stationery', 'mockup', 'Applications clés', 'Key applications'),
];

// Sector pages a researched plan adds after the dense set when the closest references show them.
export const SECTOR_SECTIONS = [
  'menu',
  'packaging',
  'signage',
  'social-media',
  'website',
  'merchandise',
  'uniform',
  'vehicle',
] as const satisfies readonly GuidelineSection[];

// Sections shown inside another page of the dense set.
const GROUPED: Partial<Record<GuidelineSection, GuidelineSection>> = {
  values: 'brand-story',
  closing: 'contents',
  'logo-construction': 'logo',
  'minimum-size': 'clear-space',
  iconography: 'pattern',
  photography: 'pattern',
  illustration: 'pattern',
  'grid-layout': 'stationery',
};

/** The page a research section is shown on: its dense page, or its own page for a sector section. */
export function homeOf(section: GuidelineSection): GuidelineSection {
  return GROUPED[section] ?? section;
}
