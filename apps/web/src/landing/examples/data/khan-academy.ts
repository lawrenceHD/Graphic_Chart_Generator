import { monoLogosOf } from './logo-selection';
import type { DemoExample } from '../schema';

// Online education. Real logo taken from the project's reference library (public/demo/logos/khan-academy.svg),
// shown as a demonstration of the product on a real mark: no client relationship is claimed. The texts are
// written for the demonstration; the primary colour is read from the file, the rest is derived from it.
export const KHAN_ACADEMY: DemoExample = {
  id: 'khan-academy',
  projectId: '00000000-0000-4000-8000-000000000002',
  name: 'Khan Academy',
  sector: 'Éducation en ligne',
  language: 'fr',
  briefText:
    "Une plateforme d'apprentissage gratuite, en ligne, pour que chaque élève avance à son rythme, des bases aux notions avancées, avec des exercices corrigés et des explications courtes.",
  logo: '/demo/logos/khan-academy.svg',
  monoLogos: monoLogosOf('khan-academy'),
  logoProvenance: 'Logo réel de la bibliothèque de référence du projet, affiché en démonstration',
  colors: {
    primary: { hex: '#14BF96', source: 'extracted' },
    accent: { hex: '#0B7A60', source: 'derived' },
    neutralLight: { hex: '#F3FBF8', source: 'derived' },
    neutralDark: { hex: '#06150F', source: 'derived' },
    extra: [{ hex: '#7FDCC5', source: 'derived' }],
  },
  pairingId: 'friendly-soft',
  archetype: 'sage',
  mission: 'Rendre un enseignement de qualité accessible à chacun, gratuitement, où qu’il soit.',
  vision: 'Un monde où le rythme et le lieu ne décident plus de ce que l’on peut apprendre.',
  values: [
    { label: 'Accessible', description: 'Gratuit, simple, ouvert à tous les niveaux.' },
    { label: 'Patient', description: 'On revient sur une notion autant de fois que nécessaire.' },
    { label: 'Rigoureux', description: 'Des contenus relus, exacts, expliqués sans jargon.' },
    { label: 'Encourageant', description: 'Chaque progrès est visible et célébré.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 62 },
      { id: 'serious-playful', value: 55 },
      { id: 'classic-avantgarde', value: 40 },
      { id: 'sober-expressive', value: 45 },
    ],
    examples: [
      'Un exercice de plus, une idée de mieux comprise.',
      'Apprendre à son rythme, sans jamais être seul.',
      'Ce que vous savez déjà est un bon point de départ.',
    ],
  },
};
