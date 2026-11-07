import type { DemoExample } from '../schema';

// Skincare. Fictional brand. The mark is drawn for the project from two circles' worth of geometry: a thin ring
// around a pearl split in two tones. No third-party artwork, free to show anywhere.
const PLUM = '#4A2B4F';
const ROSE = '#D9A7A0';

function mark(ring: string, left: string, right: string): string {
  const uri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="${ring}" stroke-width="4"/><path d="M60 30A30 30 0 0 0 60 90Z" fill="${left}"/><path d="M60 30A30 30 0 0 1 60 90Z" fill="${right}"/></svg>`,
  );
}

export const ATELIER_NACRE: DemoExample = {
  id: 'atelier-nacre',
  projectId: '00000000-0000-4000-8000-000000000004',
  name: 'Atelier Nacre',
  sector: 'Soins de la peau en petites séries',
  language: 'fr',
  briefText:
    "Atelier Nacre formule des soins pour peaux sensibles en séries de 400 flacons, avec une pharmacienne et des actifs que l'on sait nommer. Flacons en verre rechargeables, parfum réduit au strict nécessaire, une salle de bain qui se vide de ses dix produits au profit de trois.",
  logo: mark(PLUM, PLUM, ROSE),
  monoLogos: {
    black: mark('#000000', '#000000', '#000000'),
    white: mark('#FFFFFF', '#FFFFFF', '#FFFFFF'),
  },
  logoProvenance: 'Marque fictive, symbole dessiné pour le projet',
  colors: {
    primary: { hex: PLUM, source: 'extracted' },
    accent: { hex: ROSE, source: 'extracted' },
    neutralLight: { hex: '#F7F0EE', source: 'derived' },
    neutralDark: { hex: '#1E1420', source: 'derived' },
    extra: [{ hex: '#8C6A8F', source: 'derived' }],
  },
  pairingId: 'luxury-light',
  archetype: 'creator',
  mission:
    'Formuler peu de soins, très bien, et les expliquer ligne à ligne : chaque actif a sa raison, chaque flacon son numéro de série.',
  vision:
    'Une routine de trois gestes, lisible par celle qui la suit, et des flacons qui se rechargent plutôt que de se jeter.',
  values: [
    { label: 'Retenue', description: 'Moins de produits, moins de parfum, plus de preuves.' },
    { label: 'Précision', description: 'Des dosages publiés, jamais « riche en actifs ».' },
    {
      label: 'Douceur',
      description: "Une peau sensible n'est pas un cas à part, c'est la référence.",
    },
    { label: 'Durée', description: 'Du verre qui se recharge et des séries qui se suivent.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 35 },
      { id: 'serious-playful', value: 28 },
      { id: 'classic-avantgarde', value: 60 },
      { id: 'sober-expressive', value: 30 },
    ],
    examples: [
      'Trois soins. Une peau tranquille.',
      'Le sérum no 2 : 4 % de niacinamide, et rien qui ne se justifie pas.',
      'Rechargez le flacon, gardez le geste.',
    ],
  },
};
