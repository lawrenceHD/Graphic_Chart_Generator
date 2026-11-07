import type { DemoExample } from '../schema';

// Food production. Fictional brand. The mark is drawn for the project: a half sun rising over three furrows that run to the horizon. No
// third-party artwork, free to show anywhere.
const FOREST = '#2F5D3A';
const POPPY = '#E4572E';

function mark(sun: string, furrows: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 22 120 94"><path d="M32 58A28 28 0 0 1 88 58Z" fill="${sun}"/><g fill="${furrows}"><polygon points="56,62 60,62 34,112 10,112"/><polygon points="58,62 62,62 74,112 46,112"/><polygon points="60,62 64,62 110,112 86,112"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const HARROW_FIELDS: DemoExample = {
  id: 'harrow-fields',
  projectId: '00000000-0000-4000-8000-000000000005',
  name: 'Harrow Fields',
  sector: 'Stone-milled heritage flour and grain',
  language: 'en',
  briefText:
    'Harrow Fields is a milling cooperative owned by fourteen farms. It stone-mills heritage wheat, rye and oats within a day of harvest, sells flour to bakeries by the sack and to households by the kilo, and prints the field and the harvest year on every bag.',
  logo: mark(POPPY, FOREST),
  monoLogos: { black: mark('#000000', '#000000'), white: mark('#FFFFFF', '#FFFFFF') },
  logoProvenance: 'Fictional brand, symbol drawn for the project',
  colors: {
    primary: { hex: FOREST, source: 'extracted' },
    accent: { hex: POPPY, source: 'extracted' },
    neutralLight: { hex: '#F6F3E8', source: 'derived' },
    neutralDark: { hex: '#16211A', source: 'derived' },
    extra: [{ hex: '#B9A36A', source: 'derived' }],
  },
  pairingId: 'friendly-soft',
  archetype: 'everyman',
  mission:
    'Mill grain grown by our own members within a day of harvest, and put the field and the year on every bag.',
  vision: 'A bakery, a kitchen or a household that can say which field its bread came from.',
  values: [
    { label: 'Traceable', description: 'A bag is a field and a year, not a blend of both.' },
    { label: 'Fresh', description: 'Milled within a day of harvest, then sold within the month.' },
    {
      label: 'Shared',
      description: 'Fourteen farms, one mill, and the price paid back to the field.',
    },
    { label: 'Plain', description: 'Flour, a few numbers and nothing else on the label.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 68 },
      { id: 'serious-playful', value: 52 },
      { id: 'classic-avantgarde', value: 30 },
      { id: 'sober-expressive', value: 48 },
    ],
    examples: [
      'Field 7, harvest 2025. Milled Tuesday.',
      'You can taste the difference a week makes.',
      'Fourteen farms. One mill. Every bag signed.',
    ],
  },
};
