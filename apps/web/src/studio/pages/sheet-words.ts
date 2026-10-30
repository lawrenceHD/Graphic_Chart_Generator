import type { ColorRole } from '../workspace/brand-view';

// Words printed on the guideline pages. They follow the language of the document (project.language), not
// the interface: a French brand gets a French guideline even when the designer works in English.
export type SheetLanguage = 'fr' | 'en';

export interface SheetWords {
  readonly guideline: string;
  readonly edition: (year: number) => string;
  readonly roles: Readonly<Record<ColorRole, string>>;
  readonly usage: Readonly<Record<ColorRole, string>>;
  readonly lead: {
    readonly manifesto: string;
    readonly logo: string;
    readonly clearSpace: string;
    readonly doDont: string;
    readonly palette: string;
    readonly contrast: string;
    readonly typography: string;
    readonly tone: string;
    readonly tokens: string;
    readonly mockup: string;
    readonly applications: string;
  };
  readonly applications: { readonly alt: string; readonly failed: string; readonly retry: string };
  readonly manifesto: {
    readonly mission: string;
    readonly vision: string;
    readonly values: string;
    readonly pending: string;
    readonly pendingNote: string;
    readonly fromBrief: string;
  };
  readonly logo: {
    readonly primary: string;
    readonly onColor: string;
    readonly black: string;
    readonly white: string;
    readonly onLight: string;
    readonly onDark: string;
    readonly tint: string;
    readonly reversed: string;
    readonly favicon: string;
    readonly review: string;
  };
  readonly clearSpace: {
    readonly zone: (percent: number) => string;
    readonly minimum: string;
    readonly screen: string;
    readonly print: string;
  };
  readonly dont: {
    readonly correct: string;
    readonly stretch: string;
    readonly squash: string;
    readonly rotate: string;
    readonly recolor: string;
    readonly effect: string;
    readonly transparency: string;
    readonly lowContrast: string;
    readonly busy: string;
    readonly crop: string;
    readonly crowd: string;
    readonly crowdText: string;
  };
  readonly palette: { readonly scale: string; readonly cmykNote: string };
  readonly contrast: {
    readonly legend: string;
    readonly levels: Readonly<Record<'aaa' | 'aa' | 'large-ui' | 'fail', string>>;
    readonly best: string;
    readonly textOn: (text: string, background: string) => string;
  };
  readonly type: {
    readonly display: string;
    readonly text: string;
    readonly licence: string;
    readonly h1: string;
    readonly h2: string;
    readonly body: string;
    readonly caption: string;
    readonly sample: string;
  };
  readonly tone: {
    readonly axes: Readonly<
      Record<
        'formal-casual' | 'serious-playful' | 'classic-avantgarde' | 'sober-expressive',
        readonly [string, string]
      >
    >;
    readonly examples: string;
    readonly pending: string;
  };
  readonly tokens: { readonly formats: string };
}

const FR: SheetWords = {
  guideline: 'Charte graphique',
  edition: (year) => `Édition ${String(year)}`,
  roles: {
    primary: 'Principale',
    accent: 'Accent',
    neutralLight: 'Neutre clair',
    neutralDark: 'Neutre sombre',
  },
  usage: {
    primary: 'Grands aplats, couverture, signature',
    accent: 'Appels à l’action, détails',
    neutralLight: 'Fonds, respiration',
    neutralDark: 'Texte courant, titres',
  },
  lead: {
    manifesto: 'Ce que la marque défend, en une page.',
    logo: 'Le logo et ses versions officielles. Il n’est jamais redessiné.',
    clearSpace: 'L’espace minimal autour du logo, mesuré sur le logo lui-même.',
    doDont: 'Le logo s’utilise tel quel. Ces usages l’abîment.',
    palette: 'Quatre rôles, dans leurs proportions d’usage.',
    contrast: 'Chaque paire texte sur fond, vérifiée selon WCAG 2.2.',
    typography: 'Deux familles, une hiérarchie.',
    tone: 'Comment la marque parle.',
    tokens: 'Les valeurs de la charte, prêtes pour le code et Figma.',
    mockup: 'La marque en situation.',
    applications:
      'La marque sur ses supports : papeterie, affichage, objets. Les visuels suivent la charte.',
  },
  manifesto: {
    mission: 'Mission',
    vision: 'Vision',
    values: 'Valeurs',
    pending: 'Manifeste à rédiger',
    pendingNote:
      'Le copilote le rédige à partir de votre brief ; vous pouvez aussi l’écrire dans l’inspecteur.',
    fromBrief: 'Votre brief',
  },
  applications: {
    alt: 'la marque sur ses supports',
    failed: 'Cette mise en situation n’a pas pu être chargée.',
    retry: 'Relancer',
  },
  logo: {
    primary: 'Version principale',
    onColor: 'Sur la couleur principale',
    black: 'Noir',
    white: 'Blanc',
    onLight: 'Sur fond clair',
    onDark: 'Sur fond sombre',
    tint: 'Une couleur',
    reversed: 'En réserve',
    favicon: 'Favicon',
    review: 'à vérifier',
  },
  clearSpace: {
    zone: (percent) => `Zone de protection : x = ${String(percent)} % de la hauteur du logo`,
    minimum: 'Taille minimale',
    screen: 'Écran',
    print: 'Impression',
  },
  dont: {
    correct: 'Usage correct',
    stretch: 'Ne pas étirer',
    squash: 'Ne pas écraser',
    rotate: 'Ne pas pivoter',
    recolor: 'Ne pas changer les couleurs',
    effect: 'Ne pas ajouter d’effet',
    transparency: 'Ne pas rendre transparent',
    lowContrast: 'Pas de fond peu contrasté',
    busy: 'Pas de fond chargé',
    crop: 'Ne pas recadrer',
    crowd: 'Respecter la zone de protection',
    crowdText: 'Texte collé',
  },
  palette: {
    scale: 'Échelle de la principale',
    cmykNote: 'CMJN indicatif, à valider avec l’imprimeur.',
  },
  contrast: {
    legend: 'Texte (lignes) sur fond (colonnes).',
    levels: { aaa: 'AAA', aa: 'AA', 'large-ui': 'Grand texte', fail: 'Échec' },
    best: 'Paires recommandées',
    textOn: (text, background) => `${text} sur ${background}`,
  },
  type: {
    display: 'Titres',
    text: 'Texte',
    licence: 'Licence libre SIL OFL',
    h1: 'Titre 1',
    h2: 'Titre 2',
    body: 'Texte courant',
    caption: 'Légende',
    sample:
      'Une identité tient dans les détails : un espace respecté, une couleur juste, une lettre bien choisie.',
  },
  tone: {
    axes: {
      'formal-casual': ['Formel', 'Familier'],
      'serious-playful': ['Sérieux', 'Joueur'],
      'classic-avantgarde': ['Classique', 'Avant-garde'],
      'sober-expressive': ['Sobre', 'Expressif'],
    },
    examples: 'Exemples',
    pending: 'Ton à calibrer avec le copilote à partir de votre brief.',
  },
  tokens: { formats: 'CSS · Tailwind · JSON · variables Figma' },
};

const EN: SheetWords = {
  guideline: 'Brand guidelines',
  edition: (year) => `${String(year)} edition`,
  roles: {
    primary: 'Primary',
    accent: 'Accent',
    neutralLight: 'Light neutral',
    neutralDark: 'Dark neutral',
  },
  usage: {
    primary: 'Large fields, cover, signature',
    accent: 'Calls to action, details',
    neutralLight: 'Backgrounds, breathing room',
    neutralDark: 'Body text, headings',
  },
  lead: {
    manifesto: 'What the brand stands for, on one page.',
    logo: 'The logo and its official versions. It is never redrawn.',
    clearSpace: 'The minimum space around the logo, measured on the logo itself.',
    doDont: 'The logo is used as it is. These uses damage it.',
    palette: 'Four roles, in their proportions of use.',
    contrast: 'Every text-on-background pair, checked against WCAG 2.2.',
    typography: 'Two families, one hierarchy.',
    tone: 'How the brand speaks.',
    tokens: 'The guideline values, ready for code and Figma.',
    mockup: 'The brand in context.',
    applications:
      'The brand on its collateral: stationery, posters, objects. Every piece follows the guideline.',
  },
  manifesto: {
    mission: 'Mission',
    vision: 'Vision',
    values: 'Values',
    pending: 'Manifesto to write',
    pendingNote: 'The copilot writes it from your brief; you can also write it in the inspector.',
    fromBrief: 'Your brief',
  },
  applications: {
    alt: 'the brand on its collateral',
    failed: 'This mockup could not be loaded.',
    retry: 'Retry',
  },
  logo: {
    primary: 'Primary version',
    onColor: 'On the primary colour',
    black: 'Black',
    white: 'White',
    onLight: 'On a light background',
    onDark: 'On a dark background',
    tint: 'One colour',
    reversed: 'Reversed',
    favicon: 'Favicon',
    review: 'to check',
  },
  clearSpace: {
    zone: (percent) => `Clear space: x = ${String(percent)}% of the logo height`,
    minimum: 'Minimum size',
    screen: 'Screen',
    print: 'Print',
  },
  dont: {
    correct: 'Correct use',
    stretch: 'Do not stretch',
    squash: 'Do not squash',
    rotate: 'Do not rotate',
    recolor: 'Do not change the colours',
    effect: 'Do not add effects',
    transparency: 'Do not make it transparent',
    lowContrast: 'No low-contrast background',
    busy: 'No busy background',
    crop: 'Do not crop',
    crowd: 'Respect the clear space',
    crowdText: 'Crowding text',
  },
  palette: { scale: 'Primary scale', cmykNote: 'Indicative CMYK, to confirm with the printer.' },
  contrast: {
    legend: 'Text (rows) on background (columns).',
    levels: { aaa: 'AAA', aa: 'AA', 'large-ui': 'Large text', fail: 'Fail' },
    best: 'Recommended pairs',
    textOn: (text, background) => `${text} on ${background}`,
  },
  type: {
    display: 'Headings',
    text: 'Text',
    licence: 'Open licence SIL OFL',
    h1: 'Heading 1',
    h2: 'Heading 2',
    body: 'Body text',
    caption: 'Caption',
    sample:
      'An identity lives in the details: space respected, the right colour, a well-chosen letter.',
  },
  tone: {
    axes: {
      'formal-casual': ['Formal', 'Casual'],
      'serious-playful': ['Serious', 'Playful'],
      'classic-avantgarde': ['Classic', 'Avant-garde'],
      'sober-expressive': ['Sober', 'Expressive'],
    },
    examples: 'Examples',
    pending: 'Tone to calibrate with the copilot from your brief.',
  },
  tokens: { formats: 'CSS · Tailwind · JSON · Figma variables' },
};

export const SHEET_WORDS: Readonly<Record<SheetLanguage, SheetWords>> = { fr: FR, en: EN };
