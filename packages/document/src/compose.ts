import { TONE_AXIS_IDS, type PageType, type VariantRef } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { generateKeyBetween } from 'fractional-indexing';
import { BrandDocumentSchema, CURRENT_SCHEMA_VERSION, type BrandDocument } from './schema.js';

// Initial document of a project, composed at step 4 of project.analyze (02_ARCHITECTURE.md §5.2) from the
// palette (step 1), the variants (step 2) and the brand analysis (step 3). Until the AI exists (T-030), the
// analysis is the explicit default of 07_AI_COPILOT.md §3.3: texts left empty for the user to write, never
// invented content. Choices made by delegation: journal/OWNER_DECISIONS.md § T-019 part 2b.

export interface ComposeColor {
  readonly hex: string;
  readonly source: 'extracted' | 'derived' | 'user';
}

export interface ComposeInput {
  /** Project title; an empty one falls back on a neutral name (07_AI_COPILOT.md §3.2). */
  readonly brandName: string;
  readonly language: 'fr' | 'en';
  readonly logoSanitizedId: string;
  readonly colors: {
    readonly primary: ComposeColor;
    readonly accent: ComposeColor;
    readonly neutralLight: ComposeColor;
    readonly neutralDark: ComposeColor;
    readonly extra: readonly ComposeColor[];
  };
  readonly variants: readonly VariantRef[];
}

export interface ComposeError {
  readonly code: 'INVALID_DOCUMENT';
}

const MAX_BRAND_NAME = 60; // BrandAnalysis.brandName
const MAX_EXTRA_COLORS = 4;
// The MVP pages of 01_PRODUCT_MVP.md §4, mockups excepted: they come with mockup-engine (T-026).
const PAGES: readonly PageType[] = [
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
];

const WORDING = {
  fr: {
    brand: 'Ma marque',
    value: 'Valeur',
    titles: {
      cover: 'Couverture',
      manifesto: 'Manifeste',
      logo: 'Logo',
      'clear-space': "Zone d'exclusion",
      'do-dont': 'À faire, à éviter',
      palette: 'Palette',
      contrast: 'Contrastes',
      typography: 'Typographie',
      'tone-of-voice': 'Ton de voix',
      mockup: 'Mockup',
      tokens: 'Tokens',
    },
  },
  en: {
    brand: 'My brand',
    value: 'Value',
    titles: {
      cover: 'Cover',
      manifesto: 'Manifesto',
      logo: 'Logo',
      'clear-space': 'Clear space',
      'do-dont': "Do's and don'ts",
      palette: 'Palette',
      contrast: 'Contrast',
      typography: 'Typography',
      'tone-of-voice': 'Tone of voice',
      mockup: 'Mockup',
      tokens: 'Tokens',
    },
  },
} as const satisfies Record<
  ComposeInput['language'],
  { brand: string; value: string; titles: Record<PageType, string> }
>;

const color = ({ hex, source }: ComposeColor): ComposeColor => ({ hex: hex.toUpperCase(), source });

export function composeInitialDocument(input: ComposeInput): Result<BrandDocument, ComposeError> {
  const words = WORDING[input.language];
  const name = input.brandName.trim().slice(0, MAX_BRAND_NAME);
  const value = (index: number) => ({ label: `${words.value} ${String(index)}`, description: '' });
  let position: string | null = null;
  const pages = PAGES.map((type) => {
    position = generateKeyBetween(position, null);
    return {
      id: `page-${type}`,
      type,
      position,
      title: words.titles[type],
      data: {},
      overrides: {},
    };
  });
  const candidate = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    brand: {
      name: name === '' ? words.brand : name,
      mission: '',
      vision: '',
      values: [value(1), value(2), value(3), value(4)],
      // Required by the schema, which has no "unknown": the archetype of an ordinary, approachable brand.
      archetype: 'everyman',
      tone: { axes: TONE_AXIS_IDS.map((id) => ({ id, value: 50 })), examples: ['', '', ''] },
    },
    tokens: {
      colors: {
        primary: color(input.colors.primary),
        accent: color(input.colors.accent),
        neutralLight: color(input.colors.neutralLight),
        neutralDark: color(input.colors.neutralDark),
        extra: input.colors.extra.slice(0, MAX_EXTRA_COLORS).map(color),
      },
      // "Modern, versatile" in the closed catalogue (09_DESIGN_SYSTEM.md §8).
      typography: { pairingId: 'modern-geometric' },
      // 05_ENGINES.md §5.5: clear space 0.25 × H, minimum height 24 px and 12 mm.
      logo: { clearSpaceRatio: 0.25, minSizePx: 24, minSizeMm: 12 },
    },
    assets: { logoSanitizedId: input.logoSanitizedId, variants: [...input.variants] },
    pages,
  };
  const parsed = BrandDocumentSchema.safeParse(candidate);
  return parsed.success ? ok(parsed.data) : err({ code: 'INVALID_DOCUMENT' });
}
