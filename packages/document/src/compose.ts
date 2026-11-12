import {
  ChartPlanSchema,
  TONE_AXIS_IDS,
  type Archetype,
  type GuidelineSection,
  type BrandValue,
  type ChartPlan,
  type PageType,
  type PairingId,
  type Tone,
  type VariantRef,
} from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { generateKeyBetween } from 'fractional-indexing';
import {
  BrandDocumentSchema,
  CURRENT_SCHEMA_VERSION,
  type BrandDocument,
  type MinimumSize,
} from './schema.js';

// Initial document of a project, composed at step 4 of project.analyze (02_ARCHITECTURE.md §5.2) from the
// palette (step 1), the variants (step 2) and the brand analysis (step 3). Until the AI exists (T-030), the
// analysis is the explicit default of 07_AI_COPILOT.md §3.3: texts left empty for the user to write, never
// invented content. Choices made by delegation: journal/OWNER_DECISIONS.md § T-019 part 2b.

export interface ComposeColor {
  readonly hex: string;
  readonly source: 'extracted' | 'derived' | 'user';
  /** Share of the logo's surface in this colour (extraction); absent for a derived colour. */
  readonly share?: number;
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
  /** Texts and choices of the brand analysis (07_AI_COPILOT.md §3); explicit defaults when absent. */
  readonly brand?: {
    readonly mission: string;
    readonly vision: string;
    readonly values: readonly [BrandValue, BrandValue, BrandValue, BrandValue];
    readonly archetype: Archetype;
    readonly tone: Tone;
    readonly pairingId: PairingId;
  };
  /** Clear space and minimum size measured on the logo (logo-kit measureLogo); defaults when absent. */
  readonly logoRules?: {
    readonly clearSpaceRatio: number;
    readonly minSizePx: number;
    readonly minSizeMm: number;
    readonly clearSpaceSource?: 'element' | 'convention';
    readonly versions?: { readonly full: MinimumSize; readonly symbol?: MinimumSize };
  };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// Bounds of MinimumSizeSchema: a measured size outside them is brought back, never refused.
const boundedSize = (size: MinimumSize): MinimumSize => ({
  heightPx: clamp(Math.ceil(size.heightPx), 1, 4096),
  widthPx: clamp(Math.ceil(size.widthPx), 1, 4096),
  heightMm: clamp(size.heightMm, 0.5, 1000),
  widthMm: clamp(size.widthMm, 0.5, 1000),
});

function boundedVersions(versions: { readonly full: MinimumSize; readonly symbol?: MinimumSize }) {
  return {
    full: boundedSize(versions.full),
    ...(versions.symbol === undefined ? {} : { symbol: boundedSize(versions.symbol) }),
  };
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
  'mockup',
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
      mockup: 'Applications',
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
      mockup: 'Applications',
      tokens: 'Tokens',
    },
  },
} as const satisfies Record<
  ComposeInput['language'],
  { brand: string; value: string; titles: Record<PageType, string> }
>;

const color = ({ hex, source, share }: ComposeColor): ComposeColor => ({
  hex: hex.toUpperCase(),
  source,
  ...(share === undefined ? {} : { share }),
});

interface PageBlueprint {
  readonly type: PageType;
  readonly title: string;
  readonly evidence: readonly string[] | null;
  readonly section?: GuidelineSection;
}

// Without a plan: the fixed MVP pages. With one: its sections, in order, each carrying its evidence.
function blueprints(
  plan: ChartPlan | undefined,
  titles: Record<PageType, string>,
): readonly PageBlueprint[] {
  if (plan === undefined) {
    return PAGES.map((type) => ({ type, title: titles[type], evidence: null }));
  }
  return plan.sections.map(({ type, title, evidence, section }) => ({
    type,
    title,
    evidence,
    ...(section === undefined ? {} : { section }),
  }));
}

// The first page of a type keeps the historical id `page-<type>`; the next ones are numbered from 2.
function pageId(type: PageType, occurrence: number): string {
  return occurrence === 1 ? `page-${type}` : `page-${type}-${String(occurrence)}`;
}

export function composeInitialDocument(
  input: ComposeInput,
  plan?: ChartPlan,
): Result<BrandDocument, ComposeError> {
  const checkedPlan = plan === undefined ? undefined : ChartPlanSchema.safeParse(plan);
  if (checkedPlan !== undefined && !checkedPlan.success) return err({ code: 'INVALID_DOCUMENT' });
  const words = WORDING[input.language];
  const name = input.brandName.trim().slice(0, MAX_BRAND_NAME);
  const value = (index: number) => ({ label: `${words.value} ${String(index)}`, description: '' });
  let position: string | null = null;
  const seen = new Map<PageType, number>();
  const pages = blueprints(checkedPlan?.data, words.titles).map(
    ({ type, title, evidence, section }) => {
      position = generateKeyBetween(position, null);
      const occurrence = (seen.get(type) ?? 0) + 1;
      seen.set(type, occurrence);
      return {
        id: pageId(type, occurrence),
        type,
        position,
        title,
        // The section tells the studio what the page shows (ADR-035); older pages read their rank instead.
        data: evidence === null ? {} : { evidence, ...(section === undefined ? {} : { section }) },
        overrides: {},
      };
    },
  );
  const candidate = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    brand: {
      name: name === '' ? words.brand : name,
      mission: input.brand?.mission ?? '',
      vision: input.brand?.vision ?? '',
      values: input.brand?.values ?? [value(1), value(2), value(3), value(4)],
      // Required by the schema, which has no "unknown": the archetype of an ordinary, approachable brand.
      archetype: input.brand?.archetype ?? 'everyman',
      tone: input.brand?.tone ?? {
        axes: TONE_AXIS_IDS.map((id) => ({ id, value: 50 })),
        examples: ['', '', ''],
      },
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
      typography: { pairingId: input.brand?.pairingId ?? 'modern-geometric' },
      // 05_ENGINES.md §5.5: clear space 0.25 × H, minimum height 24 px and 12 mm, said to be defaults.
      // Bounds of LogoRulesSchema: a measure outside them is brought back, never refused.
      logo:
        input.logoRules === undefined
          ? { clearSpaceRatio: 0.25, minSizePx: 24, minSizeMm: 12, origin: 'default' }
          : {
              clearSpaceRatio: clamp(input.logoRules.clearSpaceRatio, 0.1, 0.5),
              minSizePx: clamp(Math.ceil(input.logoRules.minSizePx), 8, 512),
              minSizeMm: clamp(input.logoRules.minSizeMm, 2, 100),
              origin: 'measured',
              ...(input.logoRules.clearSpaceSource === undefined
                ? {}
                : { clearSpaceSource: input.logoRules.clearSpaceSource }),
              ...(input.logoRules.versions === undefined
                ? {}
                : { versions: boundedVersions(input.logoRules.versions) }),
            },
    },
    assets: { logoSanitizedId: input.logoSanitizedId, variants: [...input.variants] },
    pages,
  };
  const parsed = BrandDocumentSchema.safeParse(candidate);
  return parsed.success ? ok(parsed.data) : err({ code: 'INVALID_DOCUMENT' });
}
