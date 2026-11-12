import { z } from 'zod';
import type { Archetype } from './document-types.js';

// ADR-036: the applications a charter builds (docs/research/2026-11-11-univers-de-marque.md). A collateral is a
// generative template: a grid in modules, named zones, a few compositions chosen by mood and archetype, and a
// serialisable layout that the SVG and canvas renderers draw the same way.

const boundedText = z
  .string()
  .max(2000)
  .refine((value) => value === value.normalize('NFC'))
  .refine((value) => !/<[A-Za-z/!]/u.test(value));

export const COLLATERAL_KINDS = [
  'poster',
  'card-front',
  'card-back',
  'badge',
  'service-badge',
  'menu',
  'menu-third',
  'label-round',
  'label-band',
  'hang-tag',
  'post-square',
  'post-portrait',
  'story',
] as const;
export const CollateralKindSchema = z.enum(COLLATERAL_KINDS);
export type CollateralKind = z.infer<typeof CollateralKindSchema>;

// Same values as moodOf in the studio (art/mood.ts): the family read from the tone axes.
export const MOODS = ['warm', 'strict', 'editorial'] as const;
export const MoodSchema = z.enum(MOODS);
export type Mood = z.infer<typeof MoodSchema>;

const POSTER_COMPOSITIONS = [
  'bleed-corner',
  'plate-circle',
  'full-bleed',
  'split',
  'type-only',
] as const;

export const COMPOSITIONS = {
  poster: POSTER_COMPOSITIONS,
  'card-front': ['field', 'motif', 'quiet'],
  'card-back': ['contact'],
  badge: ['badge'],
  'service-badge': ['badge'],
  menu: ['classic', 'column', 'stamp'],
  'menu-third': ['classic', 'column', 'stamp'],
  'label-round': ['seal', 'band', 'minimal'],
  'label-band': ['seal', 'band', 'minimal'],
  'hang-tag': ['seal', 'band', 'minimal'],
  'post-square': POSTER_COMPOSITIONS,
  'post-portrait': POSTER_COMPOSITIONS,
  story: POSTER_COMPOSITIONS,
} as const satisfies Record<CollateralKind, readonly [string, ...string[]]>;

export const COMPOSITION_IDS = [
  ...POSTER_COMPOSITIONS,
  'field',
  'motif',
  'quiet',
  'contact',
  'badge',
  'classic',
  'column',
  'stamp',
  'seal',
  'band',
  'minimal',
] as const;
export const CompositionSchema = z.enum(COMPOSITION_IDS);
export type Composition = z.infer<typeof CompositionSchema>;

const PHOTO_COMPOSITIONS: ReadonlySet<Composition> = new Set<Composition>([
  'bleed-corner',
  'plate-circle',
  'full-bleed',
  'split',
  'stamp',
]);

export function needsPhoto(composition: Composition): boolean {
  return PHOTO_COMPOSITIONS.has(composition);
}

const LOUD: ReadonlySet<Archetype> = new Set<Archetype>(['jester', 'outlaw', 'hero']);
const GENTLE: ReadonlySet<Archetype> = new Set<Archetype>(['everyman', 'caregiver', 'innocent']);
const STRONG_MOTIF: ReadonlySet<Archetype> = new Set<Archetype>(['jester', 'creator']);

function posterLead(mood: Mood, archetype: Archetype, photo: boolean): Composition {
  if (!photo) return 'type-only';
  if (mood === 'strict') return 'split';
  if (LOUD.has(archetype)) return 'bleed-corner';
  // Restaurant and café brands lean warm, hence the plate in the circle as the warm default (§2.1).
  return mood === 'warm' ? 'plate-circle' : 'full-bleed';
}

/** The leading composition of a collateral (§2.0): the family by mood, the geometry by archetype. */
export function compositionFor(
  kind: CollateralKind,
  mood: Mood,
  archetype: Archetype,
  photo: boolean,
): Composition {
  switch (kind) {
    case 'poster':
    case 'post-square':
    case 'post-portrait':
    case 'story':
      return posterLead(mood, archetype, photo);
    case 'card-front':
      if (mood === 'strict') return 'quiet';
      return STRONG_MOTIF.has(archetype) ? 'motif' : 'field';
    case 'card-back':
      return 'contact';
    case 'badge':
    case 'service-badge':
      return 'badge';
    case 'menu':
    case 'menu-third':
      if (mood === 'strict') return 'classic';
      return mood === 'warm' && photo ? 'stamp' : 'column';
    case 'label-round':
    case 'label-band':
    case 'hang-tag':
      if (mood === 'warm') return 'seal';
      return mood === 'strict' ? 'minimal' : 'band';
  }
}

/**
 * The composition of item `index` of a series that opens on `head`: one step on per item, among the
 * compositions the kind can draw with or without a photo, so two posters of a page never look the same.
 */
export function seriesComposition(
  kind: CollateralKind,
  head: Composition,
  index: number,
  photo: boolean,
): Composition {
  const list: readonly Composition[] = COMPOSITIONS[kind].filter(
    (composition) => photo || !needsPhoto(composition),
  );
  const start = Math.max(0, list.indexOf(head));
  return list[(start + Math.max(0, Math.trunc(index))) % list.length] ?? head;
}

export const PHOTO_TREATMENTS = [
  'duotone',
  'warm-natural',
  'contrast-natural',
  'monochrome',
] as const;
export const PhotoTreatmentSchema = z.enum(PHOTO_TREATMENTS);
export type PhotoTreatment = z.infer<typeof PhotoTreatmentSchema>;

// Same names as the motifs of the studio (art/motif.ts).
export const MOTIF_PATTERNS = ['repeat', 'turn', 'checker', 'scatter'] as const;
export const MotifPatternSchema = z.enum(MOTIF_PATTERNS);
export type MotifPattern = z.infer<typeof MotifPatternSchema>;

export function treatmentFor(archetype: Archetype): PhotoTreatment {
  if (LOUD.has(archetype)) return 'duotone';
  if (GENTLE.has(archetype)) return 'warm-natural';
  if (archetype === 'ruler' || archetype === 'sage') return 'monochrome';
  return 'contrast-natural';
}

export function motifFor(archetype: Archetype): {
  readonly pattern: MotifPattern;
  readonly opacity: number;
} {
  if (LOUD.has(archetype)) return { pattern: 'scatter', opacity: 1 };
  if (GENTLE.has(archetype)) return { pattern: 'repeat', opacity: 1 };
  if (archetype === 'ruler' || archetype === 'sage') return { pattern: 'checker', opacity: 1 };
  return { pattern: 'turn', opacity: 0.12 };
}

export type CollateralFormat = {
  readonly unit: 'mm' | 'px';
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly rows: number;
  readonly bleed: number;
  readonly safety: number;
  // Interface bands of a story: a common practice value, not found in Instagram's help (§2.6).
  readonly reserved?: { readonly top: number; readonly bottom: number; readonly sourced: false };
};

const STORY_RESERVED = { top: 250, bottom: 340, sourced: false } as const;

export const COLLATERAL_FORMATS: Readonly<Record<CollateralKind, CollateralFormat>> = {
  poster: { unit: 'mm', width: 297, height: 420, columns: 12, rows: 17, bleed: 3, safety: 3 },
  'card-front': { unit: 'mm', width: 85, height: 55, columns: 12, rows: 8, bleed: 3, safety: 4 },
  'card-back': { unit: 'mm', width: 85, height: 55, columns: 12, rows: 8, bleed: 3, safety: 4 },
  badge: { unit: 'mm', width: 54, height: 85.6, columns: 8, rows: 12, bleed: 3, safety: 3 },
  'service-badge': { unit: 'mm', width: 76, height: 25, columns: 12, rows: 4, bleed: 3, safety: 3 },
  menu: { unit: 'mm', width: 210, height: 297, columns: 12, rows: 17, bleed: 3, safety: 3 },
  'menu-third': { unit: 'mm', width: 99, height: 210, columns: 12, rows: 25, bleed: 3, safety: 3 },
  'label-round': { unit: 'mm', width: 60, height: 60, columns: 12, rows: 12, bleed: 3, safety: 3 },
  'label-band': { unit: 'mm', width: 210, height: 50, columns: 12, rows: 3, bleed: 3, safety: 3 },
  'hang-tag': { unit: 'mm', width: 50, height: 90, columns: 12, rows: 22, bleed: 3, safety: 3 },
  'post-square': {
    unit: 'px',
    width: 1080,
    height: 1080,
    columns: 12,
    rows: 12,
    bleed: 0,
    safety: 0,
  },
  'post-portrait': {
    unit: 'px',
    width: 1080,
    height: 1350,
    columns: 12,
    rows: 15,
    bleed: 0,
    safety: 0,
  },
  story: {
    unit: 'px',
    width: 1080,
    height: 1920,
    columns: 12,
    rows: 21,
    bleed: 0,
    safety: 0,
    reserved: STORY_RESERVED,
  },
};

const NARROW_SIDE_MM = 60;

export const GridSchema = z
  .object({
    columns: z.number().int().min(1).max(24),
    rows: z.number().int().min(1).max(48),
    module: z.number().positive(),
    margin: z.number().nonnegative(),
    gutter: z.number().nonnegative(),
    baseline: z.number().positive(),
  })
  .strict();
export type Grid = z.infer<typeof GridSchema>;

/** Module = width / columns; margin 1 module, 0.75 under 60 mm a side; gutter m/4; baseline m/2 (§2.0). */
export function formatGrid(kind: CollateralKind): Grid {
  const format = COLLATERAL_FORMATS[kind];
  const module = format.width / format.columns;
  const narrow = format.unit === 'mm' && Math.min(format.width, format.height) < NARROW_SIDE_MM;
  return {
    columns: format.columns,
    rows: format.rows,
    module,
    margin: narrow ? 0.75 * module : module,
    gutter: module / 4,
    baseline: module / 2,
  };
}

// Fields the user types; Charta never invents them (§0.2).
export const TaglineSchema = boundedText.min(1).max(120);
export const BrandContactSchema = z
  .object({
    address: boundedText.min(1).max(200).optional(),
    phone: boundedText.min(1).max(40).optional(),
    email: boundedText.min(1).max(120).optional(),
    website: boundedText.min(1).max(120).optional(),
    social: boundedText.min(1).max(120).optional(),
  })
  .strict()
  .refine((contact) => Object.keys(contact).length > 0);
export type BrandContact = z.infer<typeof BrandContactSchema>;

const finite = z.number();
export const BoxSchema = z
  .object({ x: finite, y: finite, w: finite.nonnegative(), h: finite.nonnegative() })
  .strict();
export type Box = z.infer<typeof BoxSchema>;

export const COLOR_ROLES = [
  'primary',
  'accent',
  'neutralLight',
  'neutralDark',
  'white',
  'black',
] as const;
export const PaintSchema = z
  .object({ role: z.enum(COLOR_ROLES), hex: z.string().regex(/^#[0-9A-F]{6}$/u) })
  .strict();
export type Paint = z.infer<typeof PaintSchema>;

export const ZONES = [
  'background',
  'photo',
  'headline',
  'logo',
  'motif',
  'mentions',
  'name',
  'role',
  'contact',
  'rule',
] as const;
export const ZoneSchema = z.enum(ZONES);
export type Zone = z.infer<typeof ZoneSchema>;

const ShapeSchema = z.enum(['rect', 'circle']);

const FillNodeSchema = z
  .object({
    kind: z.literal('fill'),
    zone: ZoneSchema,
    box: BoxSchema,
    shape: ShapeSchema,
    paint: PaintSchema,
  })
  .strict();

const ImageNodeSchema = z
  .object({
    kind: z.literal('image'),
    zone: z.literal('photo'),
    box: BoxSchema,
    shape: ShapeSchema,
    photoId: boundedText.min(1).max(200),
    treatment: PhotoTreatmentSchema,
  })
  .strict();

const LogoNodeSchema = z
  .object({
    kind: z.literal('logo'),
    zone: z.literal('logo'),
    box: BoxSchema,
    clearSpace: BoxSchema,
    form: z.enum(['full', 'symbol']),
    // The version to draw: colour on light stock, white or black reversed (logoFor, 2.2:1).
    tone: z.enum(['color', 'white', 'black']),
    // null when the logo sits on a photo: U-04 measures it there.
    background: PaintSchema.nullable(),
    minimum: z.number().positive(),
  })
  .strict();

const TextNodeSchema = z
  .object({
    kind: z.literal('text'),
    zone: ZoneSchema,
    role: z.enum(['headline', 'subtitle', 'body', 'caption']),
    box: BoxSchema,
    font: z.enum(['display', 'text']),
    size: z.number().positive(),
    leading: z.number().positive(),
    tracking: z.number(),
    uppercase: z.boolean(),
    align: z.enum(['left', 'center', 'right']),
    lines: z.array(boundedText.max(400)).min(1).max(12),
    ink: PaintSchema,
    // Measured WCAG ratio on a flat background; null on a photo, measured there by U-04.
    contrast: z.number().min(1).max(21).nullable(),
    // A visibly generic field (« Prénom Nom »), never a plausible invented value.
    example: z.boolean(),
    // Lines left out because the zone was full (the size never goes under its floor).
    dropped: z.number().int().nonnegative(),
  })
  .strict();

const MotifNodeSchema = z
  .object({
    kind: z.literal('motif'),
    zone: z.literal('motif'),
    box: BoxSchema,
    shape: z.enum(['rect', 'ring']),
    hole: BoxSchema.nullable(),
    pattern: MotifPatternSchema,
    cell: z.number().positive(),
    opacity: z.number().min(0).max(1),
    paint: PaintSchema,
    // The motif stops at these boxes (clear space of the logo, text at full strength).
    exclude: z.array(BoxSchema).max(16),
  })
  .strict();

export const LayoutNodeSchema = z.discriminatedUnion('kind', [
  FillNodeSchema,
  ImageNodeSchema,
  LogoNodeSchema,
  TextNodeSchema,
  MotifNodeSchema,
]);
export type LayoutNode = z.infer<typeof LayoutNodeSchema>;

// Where the headline comes from, from the safest to the least safe (§0.2).
export const HEADLINE_ORIGINS = ['tagline', 'tone-example', 'value', 'name'] as const;
export const HeadlineOriginSchema = z.enum(HEADLINE_ORIGINS);
export type HeadlineOrigin = z.infer<typeof HeadlineOriginSchema>;

export const CollateralLayoutSchema = z
  .object({
    kind: CollateralKindSchema,
    composition: CompositionSchema,
    unit: z.enum(['mm', 'px']),
    width: z.number().positive(),
    height: z.number().positive(),
    bleed: z.number().nonnegative(),
    grid: GridSchema,
    nodes: z.array(LayoutNodeSchema).max(64),
    headline: HeadlineOriginSchema.nullable(),
    logoRule: z.enum(['measured', 'default']),
    // « Exemple de composition » must be shown while the headline or a field is not the user's own.
    exampleLegend: z.boolean(),
  })
  .strict();
export type CollateralLayout = z.infer<typeof CollateralLayoutSchema>;

export type LayoutError =
  | { readonly code: 'INVALID_INPUT'; readonly issues: readonly string[] }
  | { readonly code: 'KIND_NOT_BUILT'; readonly kind: CollateralKind }
  | { readonly code: 'COMPOSITION_NOT_IN_KIND'; readonly composition: Composition }
  | { readonly code: 'PHOTO_REQUIRED'; readonly composition: Composition }
  | { readonly code: 'INVALID_MEASURE' }
  | { readonly code: 'TEXT_DOES_NOT_FIT'; readonly zone: Zone }
  | { readonly code: 'LOGO_BELOW_MINIMUM'; readonly height: number; readonly minimum: number }
  | { readonly code: 'ZONES_OVERLAP'; readonly zones: readonly [Zone, Zone] };
