import {
  ARCHETYPES,
  BrandValueSchema,
  HexColor,
  PageTypeSchema,
  PAIRING_IDS,
} from '@app/contracts';
import { z } from 'zod';
import {
  DocumentTextSchema,
  JsonDataValueSchema,
  PageDataSchema,
  PageOverridesSchema,
  PageSchema,
} from './schema.js';
import { normalizeNfcDeep } from './text.js';

const CommandTextSchema = z
  .string()
  .max(2000)
  .refine((value) => !/<[A-Za-z/!]/u.test(value))
  .transform((value) => value.normalize('NFC'));

const PageIdSchema = CommandTextSchema.refine((value) => value.length > 0);
const PositionSchema = DocumentTextSchema.min(1);
const LayoutSchema = z.enum(['split', 'grid', 'full-bleed', 'minimal']);
const BrandValuesSchema = z.preprocess(
  (value) => normalizeNfcDeep(value),
  z.tuple([BrandValueSchema, BrandValueSchema, BrandValueSchema, BrandValueSchema]),
);

// ADR-018: `expect` is the value the command expects to find; `null` stands for "absent".
const SetColorTokenSchema = z
  .object({
    type: z.literal('SetColorToken'),
    token: z.enum(['primary', 'accent', 'neutralLight', 'neutralDark']),
    hex: HexColor,
    source: z.enum(['extracted', 'derived', 'user']).default('user'),
    expect: HexColor.optional(),
  })
  .strict();

const SetTypographyPairingSchema = z
  .object({
    type: z.literal('SetTypographyPairing'),
    pairingId: z.enum(PAIRING_IDS),
    expect: z.enum(PAIRING_IDS).optional(),
  })
  .strict();

function brandField<F extends string, V extends z.ZodType>(field: F, value: V) {
  return z
    .object({
      type: z.literal('SetBrandField'),
      field: z.literal(field),
      value,
      expect: value.optional(),
    })
    .strict();
}

const SetBrandFieldSchema = z.discriminatedUnion('field', [
  brandField('name', CommandTextSchema),
  brandField('mission', CommandTextSchema),
  brandField('vision', CommandTextSchema),
  brandField('values', BrandValuesSchema),
  brandField('archetype', z.enum(ARCHETYPES)),
]);

const SetPageFieldSchema = z
  .object({
    type: z.literal('SetPageField'),
    pageId: PageIdSchema,
    field: CommandTextSchema,
    value: CommandTextSchema,
    expect: CommandTextSchema.optional(),
  })
  .strict();

const SetPageOverrideSchema = z.discriminatedUnion('key', [
  z
    .object({
      type: z.literal('SetPageOverride'),
      pageId: PageIdSchema,
      key: z.literal('background'),
      value: HexColor,
      expect: HexColor.nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('SetPageOverride'),
      pageId: PageIdSchema,
      key: z.literal('layout'),
      value: LayoutSchema,
      expect: LayoutSchema.nullable().optional(),
    })
    .strict(),
]);

const ClearPageOverrideSchema = z
  .object({
    type: z.literal('ClearPageOverride'),
    pageId: PageIdSchema,
    key: z.enum(['background', 'layout']),
    expect: z.union([HexColor, LayoutSchema]).nullable().optional(),
  })
  .strict();

// Bounds are checked by apply() so that they yield VALUE_OUT_OF_RANGE, not INVALID_COMMAND.
const LogoRulesShape = {
  clearSpaceRatio: z.number(),
  minSizePx: z.number(),
  minSizeMm: z.number(),
};

const SetLogoRulesSchema = z
  .object({
    type: z.literal('SetLogoRules'),
    ...LogoRulesShape,
    expect: z.object(LogoRulesShape).strict().optional(),
  })
  .strict();

const ReorderPageSchema = z
  .object({
    type: z.literal('ReorderPage'),
    pageId: PageIdSchema,
    afterPageId: PageIdSchema.nullable(),
    position: PositionSchema.optional(),
    expect: PageIdSchema.nullable().optional(),
  })
  .strict();

// `type` is the command discriminator, so the page type travels as `pageType`.
const AddPageSchema = z
  .object({
    type: z.literal('AddPage'),
    pageId: PageIdSchema,
    pageType: PageTypeSchema,
    afterPageId: PageIdSchema.nullable(),
    title: CommandTextSchema.optional(),
    data: z.preprocess((value) => normalizeNfcDeep(value), PageDataSchema).optional(),
    overrides: PageOverridesSchema.optional(),
    position: PositionSchema.optional(),
    expect: z.null().optional(),
  })
  .strict();

const RemovePageSchema = z
  .object({ type: z.literal('RemovePage'), pageId: PageIdSchema, expect: PageSchema.optional() })
  .strict();

const SelectSceneSchema = z
  .object({
    type: z.literal('SelectScene'),
    pageId: PageIdSchema,
    sceneId: CommandTextSchema,
    finish: z.enum(['flat', 'emboss', 'deboss', 'foil']),
    expect: JsonDataValueSchema.optional(),
  })
  .strict();

const COMMAND_SCHEMAS = [
  SetColorTokenSchema,
  SetTypographyPairingSchema,
  SetBrandFieldSchema,
  SetPageFieldSchema,
  SetPageOverrideSchema,
  ClearPageOverrideSchema,
  SetLogoRulesSchema,
  ReorderPageSchema,
  AddPageSchema,
  RemovePageSchema,
  SelectSceneSchema,
] as const;

export const CommandSchema = z.discriminatedUnion('type', COMMAND_SCHEMAS);
export type Command = z.infer<typeof CommandSchema>;

// Internal inverse of SelectScene: restores data.mockup, including its absence (owner decision).
const RestoreMockupSchema = z.discriminatedUnion('hadMockup', [
  z
    .object({
      type: z.literal('RestoreMockup'),
      pageId: PageIdSchema,
      hadMockup: z.literal(true),
      previousMockup: JsonDataValueSchema,
      expect: JsonDataValueSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('RestoreMockup'),
      pageId: PageIdSchema,
      hadMockup: z.literal(false),
      expect: JsonDataValueSchema.optional(),
    })
    .strict(),
]);

export const ApplyInputSchema = z.discriminatedUnion('type', [
  ...COMMAND_SCHEMAS,
  RestoreMockupSchema,
]);
export type ApplyInput = z.infer<typeof ApplyInputSchema>;
