import type { DemoExample } from '../schema';

// Bakery and coffee house. Fictional brand, logo drawn for the project as a plain geometric mark (a disc and a
// wheat ear): no third-party artwork, free to show anywhere.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#7A3E26"/><path d="M60 102V44" stroke="#FBF5EA" stroke-width="3" stroke-linecap="round" fill="none"/><g fill="#FBF5EA"><ellipse cx="48" cy="80" rx="7" ry="15" transform="rotate(-38 48 80)"/><ellipse cx="72" cy="80" rx="7" ry="15" transform="rotate(38 72 80)"/><ellipse cx="49" cy="60" rx="6.5" ry="14" transform="rotate(-36 49 60)"/><ellipse cx="71" cy="60" rx="6.5" ry="14" transform="rotate(36 71 60)"/></g><ellipse cx="60" cy="36" rx="6.5" ry="13" fill="#E0A93B"/></svg>`;

export const MAISON_ALBA: DemoExample = {
  id: 'maison-alba',
  projectId: '00000000-0000-4000-8000-000000000002',
  name: 'Maison Alba',
  sector: 'Boulangerie et café de quartier',
  language: 'fr',
  briefText:
    "Maison Alba est une boulangerie-café de quartier qui travaille des farines de blé ancien au levain naturel. Un lieu chaleureux et sans chichis, ouvert dès l'aube, où l'on vient chercher son pain puis rester pour un café.",
  logo: `data:image/svg+xml,${encodeURIComponent(MARK)}`,
  logoProvenance: 'Marque fictive, symbole dessiné pour le projet',
  colors: {
    primary: { hex: '#7A3E26', source: 'extracted' },
    accent: { hex: '#E0A93B', source: 'extracted' },
    neutralLight: { hex: '#FBF5EA', source: 'extracted' },
    neutralDark: { hex: '#24170F', source: 'derived' },
    extra: [{ hex: '#C97B4E', source: 'derived' }],
  },
  pairingId: 'editorial-classic',
  archetype: 'caregiver',
  mission:
    'Faire du pain au levain naturel, chaque matin, avec des farines de blé ancien cultivées près de chez nous.',
  vision:
    "Que le pain du quartier retrouve sa place sur toutes les tables, et la boulangerie celle d'un lieu où l'on se retrouve.",
  values: [
    {
      label: 'Patience',
      description: 'Le levain et le temps font le travail, on ne les presse pas.',
    },
    {
      label: 'Proximité',
      description: 'Des producteurs voisins et des clients connus par leur prénom.',
    },
    { label: 'Générosité', description: 'Des portions franches et un accueil sans façon.' },
    { label: 'Exigence', description: 'Une cuisson juste, jamais « à peu près ».' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 72 },
      { id: 'serious-playful', value: 58 },
      { id: 'classic-avantgarde', value: 35 },
      { id: 'sober-expressive', value: 45 },
    ],
    examples: [
      'Pétri hier soir, sorti ce matin.',
      'Le pain a le temps. Vous aussi, le temps d’un café.',
      'Ouvert dès six heures, tant qu’il reste du pain.',
    ],
  },
};
