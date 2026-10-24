import { describe, expect, it } from 'vitest';
import { composeInitialDocument, type ComposeInput } from './compose.js';
import { BrandDocumentSchema } from './schema.js';

const input: ComposeInput = {
  brandName: '  Ombre & Grain  ',
  language: 'fr',
  logoSanitizedId: 'logo-1',
  colors: {
    primary: { hex: '#1f4bff', source: 'extracted' },
    accent: { hex: '#FF7A00', source: 'extracted' },
    neutralLight: { hex: '#F4F4FC', source: 'derived' },
    neutralDark: { hex: '#15151F', source: 'derived' },
    extra: [
      { hex: '#00AA55', source: 'extracted' },
      { hex: '#AA0055', source: 'extracted' },
      { hex: '#5500AA', source: 'extracted' },
      { hex: '#0055AA', source: 'extracted' },
      { hex: '#55AA00', source: 'extracted' },
    ],
  },
  variants: [
    { assetId: 'logo-1', kind: 'color', needsReview: false, fidelity: 1 },
    { assetId: 'v-black', kind: 'mono-black', needsReview: false, fidelity: 0.97 },
  ],
};

describe('composeInitialDocument (T-019 step 4, 07_AI_COPILOT.md §3.3)', () => {
  it('builds a valid document from the palette and the variants', () => {
    const result = composeInitialDocument(input);
    if (!result.ok) throw new Error(result.error.code);
    const document = result.value;

    expect(BrandDocumentSchema.safeParse(document).success).toBe(true);
    expect(document.brand.name).toBe('Ombre & Grain');
    expect(document.tokens.colors.primary).toEqual({ hex: '#1F4BFF', source: 'extracted' });
    expect(document.tokens.colors.extra).toHaveLength(4);
    expect(document.assets).toEqual({ logoSanitizedId: 'logo-1', variants: input.variants });
  });

  it('fills what the AI would write with explicit defaults, never invented content', () => {
    const result = composeInitialDocument(input);
    if (!result.ok) throw new Error(result.error.code);
    const { brand, tokens } = result.value;

    expect(brand.mission).toBe('');
    expect(brand.vision).toBe('');
    expect(brand.values.map((value) => value.description)).toEqual(['', '', '', '']);
    expect(brand.values.map((value) => value.label)).toEqual([
      'Valeur 1',
      'Valeur 2',
      'Valeur 3',
      'Valeur 4',
    ]);
    expect(brand.tone.axes.map((axis) => axis.value)).toEqual([50, 50, 50, 50]);
    expect(brand.tone.examples).toEqual(['', '', '']);
    expect(tokens.typography.pairingId).toBe('modern-geometric');
    // 05_ENGINES.md §5.5 defaults
    expect(tokens.logo).toEqual({ clearSpaceRatio: 0.25, minSizePx: 24, minSizeMm: 12 });
  });

  it('lists the MVP pages in order, with stable ids and sorted positions', () => {
    const result = composeInitialDocument(input);
    if (!result.ok) throw new Error(result.error.code);
    const { pages } = result.value;

    expect(pages.map((page) => page.type)).toEqual([
      'cover',
      'manifesto',
      'logo',
      'clear-space',
      'do-dont',
      'palette',
      'contrast',
      'typography',
      'tone-of-voice',
      'tokens',
    ]);
    expect(pages.map((page) => page.id)).toEqual(pages.map((page) => `page-${page.type}`));
    const positions = pages.map((page) => page.position);
    expect([...positions].sort()).toEqual(positions);
    expect(pages[0]?.title).toBe('Couverture');
  });

  it('writes in the project language and falls back on a neutral brand name', () => {
    const result = composeInitialDocument({ ...input, brandName: '   ', language: 'en' });
    if (!result.ok) throw new Error(result.error.code);

    expect(result.value.brand.name).toBe('My brand');
    expect(result.value.brand.values[0].label).toBe('Value 1');
    expect(result.value.pages[0]?.title).toBe('Cover');
    const french = composeInitialDocument({ ...input, brandName: '' });
    expect(french.ok && french.value.brand.name).toBe('Ma marque');
  });

  it('refuses inputs that cannot make a valid document', () => {
    const badColor = composeInitialDocument({
      ...input,
      colors: { ...input.colors, primary: { hex: 'blue', source: 'extracted' } },
    });
    expect(!badColor.ok && badColor.error.code).toBe('INVALID_DOCUMENT');
    const markup = composeInitialDocument({ ...input, brandName: '<script>x</script>' });
    expect(!markup.ok && markup.error.code).toBe('INVALID_DOCUMENT');
  });
});
