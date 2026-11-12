import type { SheetLanguage } from './sheet-words';
import type { TypeLevel } from './section';

// Words of the pages drawn by section (ADR-035), in the language of the document like sheet-words.ts.
export interface SectionWords {
  readonly contents: {
    readonly lead: string;
    readonly list: string;
    readonly use: string;
    readonly audience: (brand: string) => string;
    readonly required: string;
    readonly requiredText: (pages: string) => string;
    readonly free: string;
    readonly freeText: string;
    readonly files: string;
    readonly filesText: string;
    readonly edition: string;
    readonly pages: (numbers: readonly number[]) => string;
  };
  readonly families: {
    readonly lead: string;
    readonly role: Readonly<Record<'display' | 'text', string>>;
    readonly source: string;
    readonly fallback: string;
    readonly office: string;
    readonly web: string;
    readonly google: (name: string) => string;
    readonly weights: Readonly<Record<'display' | 'text', string>>;
  };
  readonly hierarchy: {
    readonly lead: string;
    readonly levels: Readonly<Record<TypeLevel, string>>;
    readonly columns: {
      readonly level: string;
      readonly size: string;
      readonly leading: string;
      readonly tracking: string;
    };
    readonly scale: string;
    readonly rules: string;
    readonly donts: readonly string[];
    readonly sample: string;
  };
  readonly pattern: {
    readonly lead: string;
    readonly fixed: string;
    readonly fixedText: string;
    readonly free: string;
    readonly freeText: string;
    readonly imagery: string;
    readonly imageryText: string;
  };
  readonly clearSpace: {
    readonly element: string;
    readonly convention: string;
    readonly defaults: string;
    readonly full: string;
    readonly symbol: string;
    readonly symbolNone: string;
    readonly size: (width: string, height: string) => string;
  };
  readonly palette: {
    readonly share: (percent: number) => string;
    readonly derived: string;
    readonly unmeasured: string;
    readonly pantone: string;
  };
  readonly applications: { readonly missing: string; readonly formats: string };
}

const FR: SectionWords = {
  contents: {
    lead: 'Ce que contient la charte et comment s’en servir.',
    list: 'Sommaire',
    use: 'Mode d’emploi',
    audience: (brand) =>
      `Pour toute personne qui produit un support de ${brand} : équipe, agence, imprimeur, développeur.`,
    required: 'Obligatoire',
    requiredText: (pages) =>
      `Le logo, sa zone de protection, ses tailles minimales, les couleurs et les polices (${pages}).`,
    free: 'Libre',
    freeText: 'La mise en page et le choix des visuels, dans le respect des pages ci-contre.',
    files: 'Fichiers',
    filesText: 'Logos (SVG, PNG, PDF), couleurs et tokens s’exportent depuis Charta.',
    edition: 'Édition en vigueur',
    pages: (numbers) =>
      numbers.length === 0
        ? ''
        : `pages ${numbers.map((n) => String(n).padStart(2, '0')).join(', ')}`,
  },
  families: {
    lead: 'Deux familles, leur rôle et leur remplaçante quand elles manquent.',
    role: { display: 'Titres', text: 'Textes' },
    source: 'Google Fonts · licence SIL Open Font License',
    fallback: 'Police de repli',
    office: 'Bureautique',
    web: 'Web',
    google: (name) => `Google Docs et Slides : ${name}, disponible`,
    weights: {
      display: 'Graisses : Semi-gras (600) et Gras (700)',
      text: 'Graisses : Normal (400), Moyen (500) pour la légende',
    },
  },
  hierarchy: {
    lead: 'Chaque niveau de texte, chiffré pour l’imprimé et l’écran.',
    levels: {
      h1: 'Titre 1',
      h2: 'Titre 2',
      h3: 'Titre 3',
      lead: 'Chapô',
      body: 'Texte courant',
      caption: 'Légende',
    },
    columns: { level: 'Niveau', size: 'Corps', leading: 'Interligne', tracking: 'Approche' },
    scale: 'Échelle de rapport 1,25 sur un texte de 10 pt (16 px à l’écran).',
    rules: 'Texte calé à gauche, en casse de phrase.',
    donts: [
      'Ne pas déformer les lettres (étirer, condenser)',
      'Pas de faux gras ni de faux italique',
      'Pas de texte courant en capitales',
      'Pas d’ombre, de contour ni de dégradé',
      'Pas d’autre police que celles de la charte et leurs replis',
    ],
    sample: 'Une identité tient dans les détails',
  },
  pattern: {
    lead: 'Le motif de la marque, tiré du logo lui-même.',
    fixed: 'Figé',
    fixedText:
      'Le dessin du logo, sans retouche ; deux aplats de la palette ; des cellules sans espace.',
    free: 'Libre',
    freeText: 'Le cadrage, le nombre de cellules et les quarts de tour.',
    imagery: 'Photographie et illustration',
    imageryText:
      'Non définies : le brief n’en dit rien. À rédiger avec la marque avant toute commande de visuels.',
  },
  clearSpace: {
    element: 'x est la hauteur d’un élément du logo, mesurée sur son dessin.',
    convention: 'Aucun élément mesurable : x suit la convention de 0,25 × la hauteur du logo.',
    defaults: 'Logo non mesuré : valeurs par défaut de Charta, à confirmer.',
    full: 'Logo complet',
    symbol: 'Symbole seul',
    symbolNone: 'Pas de symbole séparable : le logo ne descend pas sous sa taille minimale.',
    size: (width, height) => `${width} de large · ${height} de haut`,
  },
  palette: {
    share: (percent) => `${String(percent)} % du logo`,
    derived: 'Dérivée, absente du logo',
    unmeasured: 'Part non mesurée',
    pantone: 'Pantone : à faire vérifier par l’imprimeur.',
  },
  applications: {
    missing: 'La bibliothèque de Charta n’a pas encore de mise en situation pour ce support.',
    formats: 'Carte de visite 85 × 55 mm · papier à en-tête A4 210 × 297 mm',
  },
};

const EN: SectionWords = {
  contents: {
    lead: 'What the guidelines hold and how to use them.',
    list: 'Contents',
    use: 'How to use',
    audience: (brand) =>
      `For anyone who produces material for ${brand}: staff, agencies, printers, developers.`,
    required: 'Required',
    requiredText: (pages) =>
      `The logo, its clear space, its minimum sizes, the colours and the typefaces (${pages}).`,
    free: 'Free',
    freeText: 'Layout and the choice of images, within the pages listed here.',
    files: 'Files',
    filesText: 'Logos (SVG, PNG, PDF), colours and tokens are exported from Charta.',
    edition: 'Current edition',
    pages: (numbers) =>
      numbers.length === 0
        ? ''
        : `pages ${numbers.map((n) => String(n).padStart(2, '0')).join(', ')}`,
  },
  families: {
    lead: 'Two families, their role and their stand-in when they are missing.',
    role: { display: 'Headings', text: 'Text' },
    source: 'Google Fonts · SIL Open Font License',
    fallback: 'Fallback',
    office: 'Office',
    web: 'Web',
    google: (name) => `Google Docs and Slides: ${name}, available`,
    weights: {
      display: 'Weights: Semibold (600) and Bold (700)',
      text: 'Weights: Regular (400), Medium (500) for captions',
    },
  },
  hierarchy: {
    lead: 'Every level of text, sized for print and screen.',
    levels: {
      h1: 'Heading 1',
      h2: 'Heading 2',
      h3: 'Heading 3',
      lead: 'Standfirst',
      body: 'Body text',
      caption: 'Caption',
    },
    columns: { level: 'Level', size: 'Size', leading: 'Leading', tracking: 'Tracking' },
    scale: 'Scale of ratio 1.25 on a 10 pt body (16 px on screen).',
    rules: 'Text ranged left, in sentence case.',
    donts: [
      'Do not distort the letters (stretch, condense)',
      'No fake bold or fake italic',
      'No body text in capitals',
      'No shadow, outline or gradient',
      'No typeface other than the guideline’s and their fallbacks',
    ],
    sample: 'An identity lives in the details',
  },
  pattern: {
    lead: 'The brand pattern, drawn from the logo itself.',
    fixed: 'Fixed',
    fixedText: 'The logo drawing, untouched; two fields of the palette; cells without gaps.',
    free: 'Free',
    freeText: 'The crop, the number of cells and the quarter turns.',
    imagery: 'Photography and illustration',
    imageryText:
      'Not defined: the brief says nothing about them. To be written with the brand before any image is commissioned.',
  },
  clearSpace: {
    element: 'x is the height of an element of the logo, measured on its drawing.',
    convention: 'No measurable element: x follows the convention of 0.25 × the logo height.',
    defaults: 'Logo not measured: Charta defaults, to be confirmed.',
    full: 'Full logo',
    symbol: 'Symbol alone',
    symbolNone: 'No separable symbol: the logo never goes below its minimum size.',
    size: (width, height) => `${width} wide · ${height} high`,
  },
  palette: {
    share: (percent) => `${String(percent)}% of the logo`,
    derived: 'Derived, not in the logo',
    unmeasured: 'Share not measured',
    pantone: 'Pantone: to be checked by the printer.',
  },
  applications: {
    missing: 'Charta’s library has no mockup for this item yet.',
    formats: 'Business card 85 × 55 mm · A4 letterhead 210 × 297 mm',
  },
};

export const SECTION_WORDS: Readonly<Record<SheetLanguage, SectionWords>> = { fr: FR, en: EN };
