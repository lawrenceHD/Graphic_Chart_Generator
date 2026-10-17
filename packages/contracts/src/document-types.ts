import { z } from 'zod';

const boundedText = z
  .string()
  .max(2000)
  .refine((value) => value === value.normalize('NFC'))
  .refine((value) => !/<[A-Za-z/!]/u.test(value));

export const PAGE_TYPES = [
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
] as const;

export const PageTypeSchema = z.enum(PAGE_TYPES);
export type PageType = z.infer<typeof PageTypeSchema>;

export const TONE_AXIS_IDS = [
  'formal-casual',
  'serious-playful',
  'classic-avantgarde',
  'sober-expressive',
] as const;

export const ToneAxisIdSchema = z.enum(TONE_AXIS_IDS);
export type ToneAxisId = z.infer<typeof ToneAxisIdSchema>;

export const ToneAxisSchema = z
  .object({ id: ToneAxisIdSchema, value: z.number().int().min(0).max(100) })
  .strict();
export type ToneAxis = z.infer<typeof ToneAxisSchema>;

export const VARIANT_KINDS = ['color', 'mono-black', 'mono-white', 'favicon'] as const;
export const VariantKindSchema = z.enum(VARIANT_KINDS);
export type VariantKind = z.infer<typeof VariantKindSchema>;

export const VariantRefSchema = z
  .object({
    assetId: boundedText.min(1).max(64),
    kind: VariantKindSchema,
    needsReview: z.boolean(),
    fidelity: z.number().min(0).max(1).optional(),
  })
  .strict();
export type VariantRef = z.infer<typeof VariantRefSchema>;

export const PAIRING_IDS = [
  'editorial-classic',
  'modern-geometric',
  'tech-grotesk',
  'warm-serif',
  'luxury-light',
  'friendly-soft',
  'bold-display',
  'humanist-book',
] as const;

export const PairingIdSchema = z.enum(PAIRING_IDS);
export type PairingId = z.infer<typeof PairingIdSchema>;

export const ARCHETYPES = [
  'innocent',
  'sage',
  'explorer',
  'outlaw',
  'magician',
  'hero',
  'lover',
  'jester',
  'everyman',
  'caregiver',
  'ruler',
  'creator',
] as const;

export const ArchetypeSchema = z.enum(ARCHETYPES);
export type Archetype = z.infer<typeof ArchetypeSchema>;

// Same shape as BrandAnalysis.values so the document copies the analysis as is (ADR-020).
export const BrandValueSchema = z
  .object({ label: boundedText.min(1).max(24), description: boundedText.max(120) })
  .strict();
export type BrandValue = z.infer<typeof BrandValueSchema>;

export const ToneSchema = z
  .object({
    axes: z
      .array(ToneAxisSchema)
      .length(4)
      .refine((axes) => new Set(axes.map((axis) => axis.id)).size === TONE_AXIS_IDS.length),
    examples: z.array(boundedText.max(200)).length(3),
  })
  .strict();
export type Tone = z.infer<typeof ToneSchema>;
