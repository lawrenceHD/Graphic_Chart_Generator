import { describe, expect, it } from 'vitest';
import { ChartPlanSchema, DENSE_PAGES, type ChartPlan, type PageType } from '@app/contracts';
import { composeInitialDocument, type ComposeInput } from './compose.js';
import { standardChartPlan } from './plans.js';
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
    expect(tokens.logo).toEqual({
      clearSpaceRatio: 0.25,
      minSizePx: 24,
      minSizeMm: 12,
      origin: 'default',
    });
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
      'mockup',
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

  it('takes the logo rules measured on the logo (R6, R7), kept within the schema bounds', () => {
    const measured = composeInitialDocument({
      ...input,
      logoRules: { clearSpaceRatio: 0.375, minSizePx: 73, minSizeMm: 18.5 },
    });
    expect(measured.ok && measured.value.tokens.logo).toEqual({
      clearSpaceRatio: 0.375,
      minSizePx: 73,
      minSizeMm: 18.5,
      origin: 'measured',
    });
    const extreme = composeInitialDocument({
      ...input,
      logoRules: { clearSpaceRatio: 0.9, minSizePx: 2000.4, minSizeMm: 1 },
    });
    expect(extreme.ok && extreme.value.tokens.logo).toEqual({
      clearSpaceRatio: 0.5,
      minSizePx: 512,
      minSizeMm: 2,
      origin: 'measured',
    });
    const defaults = composeInitialDocument(input);
    expect(defaults.ok && defaults.value.tokens.logo).toEqual({
      clearSpaceRatio: 0.25,
      minSizePx: 24,
      minSizeMm: 12,
      origin: 'default',
    });
  });

  it('keeps the minimum of each version and the origin of the clear space, when measured', () => {
    const size = { heightPx: 24, widthPx: 68, heightMm: 5, widthMm: 14 };
    const symbol = { heightPx: 16, widthPx: 12, heightMm: 3, widthMm: 2.5 };
    const result = composeInitialDocument({
      ...input,
      logoRules: {
        clearSpaceRatio: 0.3,
        minSizePx: 68,
        minSizeMm: 14,
        clearSpaceSource: 'element',
        versions: { full: size, symbol },
      },
    });
    expect(result.ok && result.value.tokens.logo).toEqual({
      clearSpaceRatio: 0.3,
      minSizePx: 68,
      minSizeMm: 14,
      origin: 'measured',
      clearSpaceSource: 'element',
      versions: { full: size, symbol },
    });
  });

  it('keeps the share of each colour measured on the logo, and none for a derived colour', () => {
    const result = composeInitialDocument({
      ...input,
      colors: {
        ...input.colors,
        primary: { hex: '#1f4bff', source: 'extracted', share: 0.62 },
        accent: { hex: '#FF6B35', source: 'derived' },
      },
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.tokens.colors.primary).toEqual({
      hex: '#1F4BFF',
      source: 'extracted',
      share: 0.62,
    });
    expect(result.value.tokens.colors.accent).toEqual({ hex: '#FF6B35', source: 'derived' });
  });

  it('copies the brand analysis as written: texts, archetype, tone and type pairing (ADR-020)', () => {
    const brand: NonNullable<ComposeInput['brand']> = {
      mission: 'Réunir des inconnus autour d’une même table.',
      vision: 'Une table de rencontre dans chaque ville.',
      values: [
        { label: 'Hospitalité', description: 'Recevoir chacun comme un hôte.' },
        { label: 'Élégance', description: 'Un cadre soigné.' },
        { label: 'Bienveillance', description: 'Une écoute sans jugement.' },
        { label: 'Partage', description: 'Le repas comme prétexte.' },
      ],
      archetype: 'caregiver',
      tone: {
        axes: [
          { id: 'formal-casual', value: 40 },
          { id: 'serious-playful', value: 30 },
          { id: 'classic-avantgarde', value: 35 },
          { id: 'sober-expressive', value: 50 },
        ],
        examples: ['Bienvenue à table.', 'Six chaises.', 'Une place pour vous.'],
      },
      pairingId: 'warm-serif',
    };
    const result = composeInitialDocument({ ...input, brand });
    if (!result.ok) throw new Error(result.error.code);

    expect(result.value.brand).toMatchObject({
      mission: brand.mission,
      vision: brand.vision,
      archetype: 'caregiver',
      values: brand.values,
      tone: brand.tone,
    });
    expect(result.value.tokens.typography.pairingId).toBe('warm-serif');
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

const plan = (types: readonly PageType[]): ChartPlan => ({
  sections: types.map((type, index) => ({
    type,
    title: `Section ${String(index + 1)}`,
    evidence: [`ref-${String(index + 1)}`],
  })),
});

describe('composeInitialDocument with a ChartPlan', () => {
  it('produces one page per section, in plan order, with its title and evidence', () => {
    const result = composeInitialDocument(input, plan(['cover', 'palette', 'palette', 'do-dont']));
    if (!result.ok) throw new Error(result.error.code);
    const { pages } = result.value;

    expect(pages.map((page) => page.type)).toEqual(['cover', 'palette', 'palette', 'do-dont']);
    expect(pages.map((page) => page.title)).toEqual([
      'Section 1',
      'Section 2',
      'Section 3',
      'Section 4',
    ]);
    expect(pages[2]?.data).toEqual({ evidence: ['ref-3'] });
  });

  it('gives repeated types distinct stable ids and strictly increasing positions', () => {
    const result = composeInitialDocument(input, plan(['palette', 'palette', 'palette', 'mockup']));
    if (!result.ok) throw new Error(result.error.code);
    const { pages } = result.value;

    expect(pages.map((page) => page.id)).toEqual([
      'page-palette',
      'page-palette-2',
      'page-palette-3',
      'page-mockup',
    ]);
    const positions = pages.map((page) => page.position);
    expect(new Set(positions).size).toBe(4);
    expect([...positions].sort()).toEqual(positions);
  });

  it('keeps one page per type, without data, when no plan is given', () => {
    const result = composeInitialDocument(input);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.pages).toHaveLength(
      new Set(result.value.pages.map((page) => page.type)).size,
    );
    expect(result.value.pages.every((page) => Object.keys(page.data).length === 0)).toBe(true);
  });

  it('refuses a plan that does not satisfy ChartPlanSchema', () => {
    const empty = composeInitialDocument(input, { sections: [] });
    expect(!empty.ok && empty.error.code).toBe('INVALID_DOCUMENT');
    const unsafe = composeInitialDocument(input, {
      sections: [{ type: 'cover', title: '<i>x', evidence: [] }],
    });
    expect(!unsafe.ok && unsafe.error.code).toBe('INVALID_DOCUMENT');
  });

  it('writes the section of a planned page into its data, beside the evidence', () => {
    const result = composeInitialDocument(input, {
      sections: [
        { type: 'manifesto', title: 'Sommaire', evidence: [], section: 'contents' },
        { type: 'manifesto', title: 'Plateforme', evidence: ['r'], section: 'brand-story' },
      ],
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.pages.map((page) => page.data)).toEqual([
      { evidence: [], section: 'contents' },
      { evidence: ['r'], section: 'brand-story' },
    ]);
  });

  it('makes the standard plan the 14 dense pages of the content study, then the tokens', () => {
    const standard = standardChartPlan('fr');
    expect(standard.sections.map((section) => section.section)).toEqual([
      ...DENSE_PAGES.map((page) => page.section),
      undefined,
    ]);
    expect(standard.sections.at(-1)?.type).toBe('tokens');
  });

  it('builds a valid charter with one page per section of the standard plan, in both languages', () => {
    for (const language of ['fr', 'en'] as const) {
      const standard = standardChartPlan(language);
      expect(ChartPlanSchema.safeParse(standard).success).toBe(true);
      const result = composeInitialDocument({ ...input, language }, standard);
      if (!result.ok) throw new Error(result.error.code);
      expect(result.value.pages).toHaveLength(standard.sections.length);
      expect(new Set(result.value.pages.map((page) => page.title)).size).toBe(
        standard.sections.length,
      );
      expect(BrandDocumentSchema.safeParse(result.value).success).toBe(true);
    }
  });
});
