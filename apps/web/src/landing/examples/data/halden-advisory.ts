import type { DemoExample } from '../schema';

// Technology consulting. Fictional brand, logo drawn for the project as a plain geometric monogram (an H whose
// crossbar climbs): no third-party artwork, free to show anywhere.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="16" y="14" width="22" height="92" rx="3" fill="#12304F"/><rect x="82" y="14" width="22" height="92" rx="3" fill="#12304F"/><polygon points="38,72 82,36 82,62 38,98" fill="#2F9E8F"/></svg>`;

export const HALDEN_ADVISORY: DemoExample = {
  id: 'halden-advisory',
  projectId: '00000000-0000-4000-8000-000000000003',
  name: 'Halden Advisory',
  sector: 'Technology consulting for mid-sized companies',
  language: 'en',
  briefText:
    'Halden Advisory helps mid-sized companies choose, build and run their data platforms. A small senior team that writes plain recommendations, shows its numbers and stays until the system runs without it.',
  logo: `data:image/svg+xml,${encodeURIComponent(MARK)}`,
  logoProvenance: 'Fictional brand, monogram drawn for the project',
  colors: {
    primary: { hex: '#12304F', source: 'extracted' },
    accent: { hex: '#2F9E8F', source: 'extracted' },
    neutralLight: { hex: '#F2F5F7', source: 'derived' },
    neutralDark: { hex: '#0B1620', source: 'derived' },
    extra: [{ hex: '#7C93A8', source: 'derived' }],
  },
  pairingId: 'tech-grotesk',
  archetype: 'sage',
  mission:
    'Give mid-sized companies the same quality of data decisions as the largest ones, in plain language.',
  vision:
    'A market where every recommendation comes with its numbers, and every client ends up independent.',
  values: [
    { label: 'Clarity', description: 'One page beats a hundred slides.' },
    { label: 'Evidence', description: 'Every claim is backed by a figure we can show.' },
    { label: 'Independence', description: 'We leave a team that can run it alone.' },
    { label: 'Candour', description: 'We say what we would not do, and why.' },
  ],
  tone: {
    axes: [
      { id: 'formal-casual', value: 38 },
      { id: 'serious-playful', value: 22 },
      { id: 'classic-avantgarde', value: 55 },
      { id: 'sober-expressive', value: 25 },
    ],
    examples: [
      'Fewer dashboards. Better decisions.',
      'We show our numbers before we show our slides.',
      'The best handover is the one nobody notices.',
    ],
  },
};
