import type { BrandDocument } from './schema.js';

export function makeDocument(): BrandDocument {
  return {
    schemaVersion: 1,
    brand: {
      name: 'Atelier Demo',
      mission: 'Créer avec soin',
      vision: 'Des marques lisibles',
      values: [
        { label: 'Clarté', description: 'Des choix lisibles et expliqués.' },
        { label: 'Soin', description: 'Chaque détail est vérifié.' },
        { label: 'Curiosité', description: 'On cherche la meilleure idée.' },
        { label: 'Courage', description: 'On assume des partis pris.' },
      ],
      archetype: 'creator',
      tone: {
        axes: [
          { id: 'formal-casual', value: 50 },
          { id: 'serious-playful', value: 40 },
          { id: 'classic-avantgarde', value: 60 },
          { id: 'sober-expressive', value: 55 },
        ],
        examples: ['Une voix précise.', 'Un ton ouvert.', 'Des mots simples.'],
      },
    },
    tokens: {
      colors: {
        primary: { hex: '#1F4BFF', source: 'extracted' },
        accent: { hex: '#FFD60A', source: 'derived' },
        neutralLight: { hex: '#FFFFFF', source: 'user' },
        neutralDark: { hex: '#202124', source: 'user' },
        extra: [],
      },
      typography: { pairingId: 'modern-geometric' },
      logo: { clearSpaceRatio: 0.2, minSizePx: 24, minSizeMm: 8 },
    },
    assets: {
      logoSanitizedId: 'logo-sanitized-1',
      variants: [{ assetId: 'logo-color-1', kind: 'color', needsReview: false, fidelity: 1 }],
    },
    pages: [
      {
        id: 'page-cover',
        type: 'cover',
        position: 'a0',
        title: 'Couverture',
        data: { subtitle: 'Un texte de couverture' },
        overrides: {},
      },
      {
        id: 'page-mockup',
        type: 'mockup',
        position: 'a1',
        title: 'Mockup',
        data: { caption: 'Scène actuelle', mockup: { sceneId: 'scene-old', finish: 'flat' } },
        overrides: { layout: 'split' },
      },
    ],
  };
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && 'value' in descriptor) {
      deepFreeze(descriptor.value);
    }
  }

  Object.freeze(value);
  return value;
}
