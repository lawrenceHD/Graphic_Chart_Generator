import { apply, composeInitialDocument, type BrandDocument, type Command } from '@app/document';
import { brandView, type BrandView } from '../studio/workspace/brand-view';
import type { ProjectSummary } from '../studio/workspace/document-client';

// The landing's example is a real guideline, not a mock-up: La Mèza (logo owned by the project owner, free to
// show publicly, journal/OWNER_DECISIONS.md), composed by composeInitialDocument from the values the analysis
// measured on its logo, then edited with the commands a designer sends in the studio. The texts are quoted
// from the brand's own brief (C:\Users\KURO\Documents\la maza\LA_MEZA_brief_identite_visuelle.md).
const LOGO = '/demo/la-meza/logo.png';

const PROJECT: ProjectSummary = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'La Mèza',
  industryLabel: 'Hospitalité · dîners entre inconnus',
  language: 'fr',
  briefText:
    "La Mèza réunit des personnes qui ne se connaissent pas autour d'une même table (6 à 10 convives) pour créer des rencontres authentiques, favoriser le partage d'expériences et lutter contre l'isolement social, dans un cadre élégant, intimiste et bienveillant.",
  status: 'ready',
};

// Studio edits: the brief's mission and vision, its four "la marque est" words, a warmer type pairing.
const EDITS: readonly Command[] = [
  {
    type: 'SetBrandField',
    field: 'mission',
    value:
      "Organiser et animer des rencontres conviviales de 6 à 10 convives autour d'une même table, dans un lieu choisi.",
  },
  {
    type: 'SetBrandField',
    field: 'vision',
    value:
      'Recréer des espaces de rencontre authentiques, où une soirée peut devenir une amitié, une collaboration ou un moment humain mémorable.',
  },
  {
    type: 'SetBrandField',
    field: 'values',
    value: [
      { label: 'Accueillante', description: 'Rassurer, inviter et donner envie, sans intimider.' },
      { label: 'Raffinée', description: 'Un luxe accessible, élégant sans distance.' },
      { label: 'Humaine', description: "Reconnecter l'humain à l'humain." },
      { label: 'Sincère', description: 'Des conversations qui comptent, jamais de misérabilisme.' },
    ],
  },
  { type: 'SetTypographyPairing', pairingId: 'warm-serif' },
];

function compose(): BrandDocument {
  const composed = composeInitialDocument({
    brandName: 'La Mèza',
    language: 'fr',
    logoSanitizedId: 'demo-logo',
    // Measured by the analysis on the owner's file "Fichier 6.png" (studio run of 2026-10-29).
    colors: {
      primary: { hex: '#D88F7A', source: 'extracted' },
      accent: { hex: '#E3C884', source: 'extracted' },
      neutralLight: { hex: '#FCF3F0', source: 'derived' },
      neutralDark: { hex: '#000000', source: 'extracted' },
      extra: [{ hex: '#A6B49B', source: 'extracted' }],
    },
    variants: [{ assetId: 'demo-logo', kind: 'color', needsReview: false }],
  });
  if (!composed.ok) throw new Error('demo document does not compose');
  let document = composed.value;
  for (const command of EDITS) {
    const applied = apply(document, command);
    if (!applied.ok) throw new Error(`demo edit refused: ${applied.error.code}`);
    document = applied.value.doc;
  }
  // The tone has no command yet (07 §4): the brief's own signatures and register, set on the fixture.
  return {
    ...document,
    brand: {
      ...document.brand,
      tone: {
        axes: [
          { id: 'formal-casual', value: 42 },
          { id: 'serious-playful', value: 38 },
          { id: 'classic-avantgarde', value: 32 },
          { id: 'sober-expressive', value: 40 },
        ],
        examples: [
          'Une table. Des inconnus. Des histoires qui rapprochent.',
          "Parce qu'une simple place à table peut changer une vie.",
          'Chaque repas, des rencontres authentiques et des conversations qui comptent.',
        ],
      },
    },
  };
}

export const DEMO_DOCUMENT: BrandDocument = compose();

export const DEMO_VIEW: BrandView = (() => {
  const view = brandView(DEMO_DOCUMENT, PROJECT);
  return {
    ...view,
    written: true,
    logo: { color: LOGO, vector: null, 'mono-black': null, 'mono-white': null, favicon: null },
  };
})();
