import { ArchetypeSchema, BrandValueSchema, PairingIdSchema, ToneSchema } from '@app/contracts';
import { z } from 'zod';

const HexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/u);
const ColorSchema = z
  .object({ hex: HexSchema, source: z.enum(['extracted', 'derived', 'user']) })
  .strict();

// A logo is a path under /public or a self-contained SVG data URI: never a remote address.
const LogoSchema = z.string().regex(/^(\/[\w./-]+|data:image\/svg\+xml[^"'<>\s]+)$/u);

/**
 * One demonstration brand of the landing page. Charta is a generic product; every name, palette and text that the
 * landing shows about a brand comes from one of these records, never from the code.
 */
export const DemoExampleSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/u),
    /** Stable project identifier handed to the studio view (not a real project). */
    projectId: z.uuid(),
    name: z.string().min(1).max(60),
    /** Sector label shown with the example. */
    sector: z.string().min(1).max(80),
    language: z.enum(['fr', 'en']),
    briefText: z.string().min(1).max(2000),
    logo: LogoSchema,
    /** Hand-drawn one-colour versions of the logo (black and white), when the example has them. */
    monoLogos: z.object({ black: LogoSchema, white: LogoSchema }).strict().optional(),
    /** Where the logo comes from: documented so that no example ever carries a third-party mark. */
    logoProvenance: z.string().min(1).max(200),
    colors: z
      .object({
        primary: ColorSchema,
        accent: ColorSchema,
        neutralLight: ColorSchema,
        neutralDark: ColorSchema,
        extra: z.array(ColorSchema).max(4),
      })
      .strict(),
    pairingId: PairingIdSchema,
    archetype: ArchetypeSchema,
    mission: z.string().min(1).max(300),
    vision: z.string().min(1).max(300),
    values: z.tuple([BrandValueSchema, BrandValueSchema, BrandValueSchema, BrandValueSchema]),
    tone: ToneSchema,
  })
  .strict();

export type DemoExample = z.infer<typeof DemoExampleSchema>;

/**
 * One logo of the curated selection shown on mock-ups: a real mark from the project's reference library, copied
 * under /public/demo/logos. The name is the mark's own; the palette is read from the file, never invented.
 */
export const LogoPickSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/u),
    name: z.string().min(1).max(60),
    /** File name in the reference library (before it was copied to /public). */
    sourceFile: z.string().regex(/^[\w.-]+\.svg$/u),
    /** Path of the copy served by the app. */
    logo: LogoSchema,
    sector: z.string().min(1).max(80),
    markType: z.enum(['wordmark', 'lettermark', 'letterform', 'emblem', 'pictorial', 'abstract']),
    /** Colours read from the SVG, one to three. */
    palette: z.array(HexSchema).min(1).max(3),
  })
  .strict();

export type LogoPick = z.infer<typeof LogoPickSchema>;
