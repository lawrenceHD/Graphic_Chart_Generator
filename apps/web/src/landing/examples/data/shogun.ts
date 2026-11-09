import type { DemoExample } from '../schema';

// E-commerce tooling. Real logo taken from the project's reference library (public/demo/logos/shogun.svg),
// shown as a demonstration of the product on a real mark: no client relationship is claimed. The primary colour
// is read from the file; the rest is derived.
export const SHOGUN: DemoExample = {
  id: 'shogun',
  projectId: '00000000-0000-4000-8000-000000000005',
  name: 'Shogun',
  sector: 'Outils pour boutiques en ligne',
  language: 'en',
  briefText:
    'A page builder for online shops: merchants design product and landing pages visually, test what converts and ship without waiting for a developer. A confident, fast-moving tool for growing brands.',
  logo: '/demo/logos/shogun.svg',
  logoProvenance: "Real logo from the project's reference library, shown as a demonstration",
  colors: {
    primary: { hex: '#5D50C6', source: 'extracted' },
    accent: { hex: '#F2B84B', source: 'derived' },
    neutralLight: { hex: '#F5F4FC', source: 'derived' },
    neutralDark: { hex: '#14112B', source: 'derived' },
    extra: [{ hex: '#A59DE8', source: 'derived' }],
  },
  pairingId: 'modern-geometric',
  archetype: 'creator',
  mission: 'Let any merchant build the shop page they imagine, then prove it sells.',
  vision: 'Online shops that look designed and convert like they were tested, whatever the team size.',
  values: [
    { label: 'Speed', description: 'From idea to published page in an afternoon.' },
    { label: 'Craft', description: 'Fine control without the code.' },
    { label: 'Evidence', description: 'Every change is measured before it is kept.' },
    { label: 'Ambition', description: 'Built for brands that intend to grow.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 60 },
      { id: 'serious-playful', value: 50 },
      { id: 'classic-avantgarde', value: 70 },
      { id: 'sober-expressive', value: 62 },
    ],
    examples: [
      'Design the page. Ship it today.',
      'Stop guessing which layout sells.',
      'Your shop deserves more than a template.',
    ],
  },
};
