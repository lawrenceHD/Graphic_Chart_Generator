import {
  ArchetypeSchema,
  BrandValueSchema,
  PageTypeSchema,
  PairingIdSchema,
  ToneSchema,
  VariantRefSchema,
} from '@app/contracts';
import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_DOCUMENT_BYTES = 512 * 1024;

export const DocumentTextSchema = z
  .string()
  .max(2000)
  .refine((value) => value === value.normalize('NFC'))
  .refine((value) => !/<[A-Za-z/!]/u.test(value));

function isDocumentText(value: string): boolean {
  return value.length <= 2000 && value === value.normalize('NFC') && !/<[A-Za-z/!]/u.test(value);
}

type PendingValue = { readonly value: unknown; readonly leaving: boolean };

function isJsonSerializable(root: unknown): boolean {
  const active = new WeakSet();
  const pending: PendingValue[] = [{ value: root, leaving: false }];

  while (pending.length > 0) {
    const item = pending.pop();
    if (!item) {
      continue;
    }
    const value = item.value;

    if (typeof value === 'string') {
      if (!isDocumentText(value)) {
        return false;
      }
      continue;
    }
    if (value === null || typeof value === 'boolean') {
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return false;
      }
      continue;
    }
    if (typeof value !== 'object') {
      return false;
    }

    if (item.leaving) {
      active.delete(value);
      continue;
    }
    if (active.has(value) || Object.getOwnPropertySymbols(value).length > 0) {
      return false;
    }
    active.add(value);
    pending.push({ value, leaving: true });

    if (Array.isArray(value)) {
      const array: readonly unknown[] = value;
      for (let index = array.length - 1; index >= 0; index -= 1) {
        const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
        if (!descriptor) {
          pending.push({ value: null, leaving: false });
        } else if ('value' in descriptor) {
          pending.push({ value: descriptor.value, leaving: false });
        } else {
          return false;
        }
      }
      continue;
    }

    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (
        typeof key !== 'string' ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      ) {
        return false;
      }
      if (!isDocumentText(key)) {
        return false;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) {
        return false;
      }
      pending.push({ value: descriptor.value, leaving: false });
    }
  }

  return true;
}

export const JsonDataValueSchema = z.unknown().superRefine((value, context) => {
  if (!isJsonSerializable(value)) {
    context.addIssue({ code: 'custom', message: 'Invalid JSON value.' });
  }
});

const DataKeySchema = DocumentTextSchema.refine(
  (key) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype',
);

const SafePageDataInputSchema = z.unknown().superRefine((value, context) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'string' && ['__proto__', 'constructor', 'prototype'].includes(key)) {
      context.addIssue({ code: 'custom', message: 'Dangerous data key.' });
    }
  }
});

export const PageDataSchema = SafePageDataInputSchema.pipe(
  z.record(DataKeySchema, JsonDataValueSchema),
);
export type PageData = z.infer<typeof PageDataSchema>;

export const PageOverridesSchema = z
  .object({
    background: z
      .string()
      .regex(/^#[0-9A-F]{6}$/u)
      .optional(),
    layout: z.enum(['split', 'grid', 'full-bleed', 'minimal']).optional(),
  })
  .strict();
export type PageOverrides = z.infer<typeof PageOverridesSchema>;

export const ColorTokenSchema = z
  .object({
    hex: z.string().regex(/^#[0-9A-F]{6}$/u),
    source: z.enum(['extracted', 'derived', 'user']),
  })
  .strict();
export type ColorToken = z.infer<typeof ColorTokenSchema>;

export const PageSchema = z
  .object({
    id: DocumentTextSchema,
    type: PageTypeSchema,
    position: DocumentTextSchema,
    title: DocumentTextSchema,
    data: PageDataSchema,
    overrides: PageOverridesSchema,
  })
  .strict();
export type Page = z.infer<typeof PageSchema>;

const LogoRulesSchema = z
  .object({
    clearSpaceRatio: z.number().min(0.1).max(0.5),
    minSizePx: z.number().int().min(8).max(512),
    minSizeMm: z.number().min(2).max(100),
  })
  .strict();

const AssetsSchema = z
  .object({
    logoSanitizedId: DocumentTextSchema,
    variants: z
      .array(VariantRefSchema)
      .max(8)
      .refine(
        (variants) => new Set(variants.map((variant) => variant.kind)).size === variants.length,
      ),
  })
  .strict();

export const BrandDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    brand: z
      .object({
        name: DocumentTextSchema,
        mission: DocumentTextSchema,
        vision: DocumentTextSchema,
        values: z.tuple([BrandValueSchema, BrandValueSchema, BrandValueSchema, BrandValueSchema]),
        archetype: ArchetypeSchema,
        tone: ToneSchema,
      })
      .strict(),
    tokens: z
      .object({
        colors: z
          .object({
            primary: ColorTokenSchema,
            accent: ColorTokenSchema,
            neutralLight: ColorTokenSchema,
            neutralDark: ColorTokenSchema,
            extra: z.array(ColorTokenSchema).max(4),
          })
          .strict(),
        typography: z.object({ pairingId: PairingIdSchema }).strict(),
        logo: LogoRulesSchema,
      })
      .strict(),
    assets: AssetsSchema,
    pages: z.array(PageSchema),
  })
  .strict()
  .superRefine((document, context) => {
    if (new Set(document.pages.map((page) => page.id)).size !== document.pages.length) {
      context.addIssue({ code: 'custom', path: ['pages'], message: 'Page ids must be unique.' });
    }
    if (new Set(document.pages.map((page) => page.position)).size !== document.pages.length) {
      context.addIssue({
        code: 'custom',
        path: ['pages'],
        message: 'Page positions must be unique.',
      });
    }
    const serialized = JSON.stringify(document);
    if (
      typeof serialized !== 'string' ||
      new TextEncoder().encode(serialized).length > MAX_DOCUMENT_BYTES
    ) {
      context.addIssue({ code: 'custom', message: 'DOCUMENT_TOO_LARGE' });
    }
  });

export type BrandDocument = z.infer<typeof BrandDocumentSchema>;
