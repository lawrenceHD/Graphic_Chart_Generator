import { z } from 'zod';
import { HexColor } from './hex-color.js';

// Vocabulary of the private reference library (owner decision 2026-10-29, ADR-028). Mirrored by
// tools/references/vocabulary.json, which the indexer sends to Gemini; reference.test.ts keeps both identical.

export const REFERENCE_KINDS = [
  'guideline-spread',
  'brand-board',
  'logo-presentation',
  'mockup-scene',
  'stationery',
  'packaging',
  'signage',
  'social-media',
  'digital-ui',
  'apparel',
  'other',
] as const;

// Sections a professional guideline can contain, observed in the owner's reference charters (Slack, BBC,
// Instacart, État, Data Terra, Nevers, CFDT, Porto) and in the reference library.
export const GUIDELINE_SECTIONS = [
  'cover',
  'contents',
  'brand-story',
  'values',
  'logo',
  'logo-construction',
  'logo-variants',
  'clear-space',
  'minimum-size',
  'misuse',
  'palette',
  'color-ratio',
  'typography',
  'type-hierarchy',
  'iconography',
  'pattern',
  'photography',
  'illustration',
  'grid-layout',
  'stationery',
  'packaging',
  'signage',
  'social-media',
  'website',
  'merchandise',
  'uniform',
  'vehicle',
  'menu',
  'tone-of-voice',
  'closing',
] as const;

export const VISUAL_STYLES = [
  'minimal',
  'luxury',
  'playful',
  'editorial',
  'organic',
  'bold',
  'retro',
  'geometric',
  'handcrafted',
  'corporate',
  'tech',
  'afrocentric',
  'warm',
  'monochrome',
  'colorful',
  'elegant',
  'industrial',
  'natural',
] as const;

export const TYPE_STYLES = [
  'geometric-sans',
  'grotesque-sans',
  'humanist-sans',
  'serif-oldstyle',
  'serif-transitional',
  'didone',
  'slab',
  'script',
  'display',
  'monospace',
  'none',
] as const;

export const WHITESPACE_LEVELS = ['tight', 'balanced', 'generous'] as const;
export const BACKGROUND_KINDS = ['light', 'dark', 'brand-color', 'photo', 'textured'] as const;

export const ReferenceKindSchema = z.enum(REFERENCE_KINDS);
export const GuidelineSectionSchema = z.enum(GUIDELINE_SECTIONS);
export const VisualStyleSchema = z.enum(VISUAL_STYLES);
export const TypeStyleSchema = z.enum(TYPE_STYLES);
export type ReferenceKind = z.infer<typeof ReferenceKindSchema>;
export type GuidelineSection = z.infer<typeof GuidelineSectionSchema>;
export type VisualStyle = z.infer<typeof VisualStyleSchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;

// Model output is untrusted: lists are deduplicated and bounded, free text is short and plain.
const mockupName = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(40)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} '&/-]*$/u);
const unique = <T>(items: T[]): T[] => [...new Set(items)];

export const ReferenceCardSchema = z
  .object({
    kind: ReferenceKindSchema,
    sections: z.array(GuidelineSectionSchema).max(30).transform(unique),
    mockups: z
      .array(z.string())
      .max(20)
      .transform((items) =>
        unique(
          items.flatMap((item) => {
            const parsed = mockupName.safeParse(item);
            return parsed.success ? [parsed.data] : [];
          }),
        ),
      ),
    styles: z.array(VisualStyleSchema).min(1).max(6).transform(unique),
    headingType: TypeStyleSchema,
    bodyType: TypeStyleSchema,
    whitespace: z.enum(WHITESPACE_LEVELS),
    background: z.enum(BACKGROUND_KINDS),
    palette: z
      .array(z.string())
      .max(8)
      .transform((items) =>
        unique(
          items.flatMap((item) => {
            const parsed = HexColor.safeParse(item);
            return parsed.success ? [parsed.data] : [];
          }),
        ).slice(0, 6),
      ),
    quality: z.number().int().min(1).max(5),
    insight: z
      .string()
      .trim()
      .max(240)
      // Untrusted text read from a third-party image: plain prose only (no markup, no control characters).
      .refine((value) => !/<[A-Za-z/!]|\p{Cc}/u.test(value)),
  })
  .strict();
export type ReferenceCard = z.infer<typeof ReferenceCardSchema>;

export const IndexedReferenceSchema = z
  .object({
    id: z.string().min(1).max(80),
    sector: z.string().regex(/^[a-z0-9-]{2,40}$/),
    // "<sector>/<file name>": no drive letter, backslash, control character or parent segment.
    file: z
      .string()
      .max(240)
      .regex(/^[a-z0-9-]{2,40}\/[^/\\:\p{Cc}]{1,200}$/u)
      .refine((value) => !value.includes('..')),
    card: ReferenceCardSchema,
    embedding: z.array(z.number()).min(64).max(3072),
    model: z
      .object({ vision: z.string(), embedding: z.string(), dimensions: z.number().int() })
      .strict(),
  })
  .strict()
  .refine((line) => line.model.dimensions === line.embedding.length, {
    message: 'model.dimensions must equal the embedding length',
  });
export type IndexedReference = z.infer<typeof IndexedReferenceSchema>;

// Sectors of the reference library, mirrored by the keys of tools/references/sectors.json (synchronised by test).
export const REFERENCE_SECTORS = [
  'restaurant',
  'cafe-bakery',
  'hospitality-events',
  'fashion',
  'beauty-cosmetics',
  'health-clinic',
  'tech-startup',
  'finance',
  'education',
  'real-estate-construction',
  'agriculture-food-products',
  'ngo-community',
  'sport-fitness',
  'retail-ecommerce',
  'transport-logistics',
  'consulting-legal',
  'media-music-creative',
  'kids-family',
  'african-brands',
] as const;
export const ReferenceSectorSchema = z.enum(REFERENCE_SECTORS);
export type ReferenceSector = z.infer<typeof ReferenceSectorSchema>;
