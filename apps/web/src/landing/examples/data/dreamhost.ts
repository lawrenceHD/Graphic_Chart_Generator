import { monoLogosOf } from './logo-selection';
import type { DemoExample } from '../schema';

// Web hosting. Real logo taken from the project's reference library (public/demo/logos/dreamhost.svg), shown as
// a demonstration of the product on a real mark: no client relationship is claimed. Both colours are read from
// the file; the neutrals are derived.
export const DREAMHOST: DemoExample = {
  id: 'dreamhost',
  projectId: '00000000-0000-4000-8000-000000000003',
  name: 'DreamHost',
  sector: 'Hébergement web',
  language: 'en',
  briefText:
    'Web hosting for independent sites and small businesses: reliable servers, plain pricing and support that answers like a person. A calm, trustworthy service for people who would rather build than administer.',
  logo: '/demo/logos/dreamhost.svg',
  monoLogos: monoLogosOf('dreamhost'),
  logoProvenance: "Real logo from the project's reference library, shown as a demonstration",
  colors: {
    primary: { hex: '#1F3244', source: 'extracted' },
    accent: { hex: '#3E95BE', source: 'extracted' },
    neutralLight: { hex: '#F2F6F9', source: 'derived' },
    neutralDark: { hex: '#0E1822', source: 'derived' },
    extra: [{ hex: '#8FC3DB', source: 'derived' }],
  },
  pairingId: 'tech-grotesk',
  archetype: 'ruler',
  mission: 'Keep independent websites fast, safe and online, with pricing anyone can read.',
  vision: 'A web where owning your corner of it is as easy as having an idea.',
  values: [
    { label: 'Reliability', description: 'Uptime is the product, everything else is detail.' },
    { label: 'Transparency', description: 'No hidden fees, no fine print that bites later.' },
    { label: 'Independence', description: 'Your site, your data, your terms.' },
    { label: 'Humanity', description: 'Support written and answered by people.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 55 },
      { id: 'serious-playful', value: 35 },
      { id: 'classic-avantgarde', value: 50 },
      { id: 'sober-expressive', value: 30 },
    ],
    examples: [
      'Your site stays up. That is the whole pitch.',
      'Plain pricing, in plain English.',
      'Build the thing. We keep the lights on.',
    ],
  },
};
