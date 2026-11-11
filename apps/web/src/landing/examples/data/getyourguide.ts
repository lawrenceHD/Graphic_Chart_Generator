import { monoLogosOf } from './logo-selection';
import type { DemoExample } from '../schema';

// Travel experiences. Real logo taken from the project's reference library (public/demo/logos/getyourguide.svg),
// shown as a demonstration of the product on a real mark: no client relationship is claimed. The primary colour
// is read from the file; the rest is derived.
export const GETYOURGUIDE: DemoExample = {
  id: 'getyourguide',
  projectId: '00000000-0000-4000-8000-000000000004',
  name: 'GetYourGuide',
  sector: 'Voyages et expériences',
  language: 'fr',
  briefText:
    'Une place de marché pour réserver des visites, des billets et des activités sur place, partout dans le monde : des guides locaux, des annulations simples et des avis de voyageurs vérifiés.',
  logo: '/demo/logos/getyourguide.svg',
  monoLogos: monoLogosOf('getyourguide'),
  logoProvenance: 'Logo réel de la bibliothèque de référence du projet, affiché en démonstration',
  colors: {
    primary: { hex: '#FF5533', source: 'extracted' },
    accent: { hex: '#1D2B4A', source: 'derived' },
    neutralLight: { hex: '#FFF6F2', source: 'derived' },
    neutralDark: { hex: '#1A1210', source: 'derived' },
    extra: [{ hex: '#FFB199', source: 'derived' }],
  },
  pairingId: 'bold-display',
  archetype: 'explorer',
  mission: 'Faire de chaque voyage une série de moments à vivre, réservables en quelques secondes.',
  vision: 'Que découvrir un lieu avec un guide du coin devienne le réflexe de tout voyageur.',
  values: [
    {
      label: 'Curieux',
      description: 'Toujours à la recherche de la visite que personne ne raconte.',
    },
    { label: 'Fiable', description: 'Une réservation claire, une annulation sans embarras.' },
    {
      label: 'Local',
      description: 'Des guides qui connaissent la rue, pas seulement le monument.',
    },
    { label: 'Enthousiaste', description: 'On donne envie de partir sans promettre la lune.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 70 },
      { id: 'serious-playful', value: 65 },
      { id: 'classic-avantgarde', value: 55 },
      { id: 'sober-expressive', value: 68 },
    ],
    examples: [
      'Demain, vous visiterez comme un habitant.',
      'Réservé en trois clics, raconté pour toujours.',
      'La plus belle vue n’est pas dans le guide.',
    ],
  },
};
