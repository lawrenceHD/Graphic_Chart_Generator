import type { DemoExample } from '../schema';

// Hospitality. The logo is owned by the project owner, who allows its public display (journal/OWNER_DECISIONS.md).
// The measured colours come from the studio run of 2026-10-29 on the owner's file; the texts are quoted from the
// brand's own identity brief.
export const LA_MEZA: DemoExample = {
  id: 'la-meza',
  projectId: '00000000-0000-4000-8000-000000000001',
  name: 'La Mèza',
  sector: 'Hospitalité · dîners entre inconnus',
  language: 'fr',
  briefText:
    "La Mèza réunit des personnes qui ne se connaissent pas autour d'une même table (6 à 10 convives) pour créer des rencontres authentiques, favoriser le partage d'expériences et lutter contre l'isolement social, dans un cadre élégant, intimiste et bienveillant.",
  logo: '/demo/la-meza/logo.png',
  logoProvenance: 'Logo du propriétaire du projet, diffusion publique autorisée',
  colors: {
    primary: { hex: '#D88F7A', source: 'extracted' },
    accent: { hex: '#E3C884', source: 'extracted' },
    neutralLight: { hex: '#FCF3F0', source: 'derived' },
    neutralDark: { hex: '#000000', source: 'extracted' },
    extra: [{ hex: '#A6B49B', source: 'extracted' }],
  },
  pairingId: 'warm-serif',
  archetype: 'caregiver',
  mission:
    "Organiser et animer des rencontres conviviales de 6 à 10 convives autour d'une même table, dans un lieu choisi.",
  vision:
    'Recréer des espaces de rencontre authentiques, où une soirée peut devenir une amitié, une collaboration ou un moment humain mémorable.',
  values: [
    { label: 'Accueillante', description: 'Rassurer, inviter et donner envie, sans intimider.' },
    { label: 'Raffinée', description: 'Un luxe accessible, élégant sans distance.' },
    { label: 'Humaine', description: "Reconnecter l'humain à l'humain." },
    { label: 'Sincère', description: 'Des conversations qui comptent, jamais de misérabilisme.' },
  ],
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
};
