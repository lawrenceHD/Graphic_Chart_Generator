import { GuidelineSectionSchema, TypeStyleSchema, VisualStyleSchema } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { ImageInput } from '../gemini/logo-reading.js';
import { LogoReadingSchema } from '../gemini/logo-reading.js';
import type { ArtDirection } from '../references/direction.js';
import type { BrandResearch } from '../research.js';

// A recorded research is a JSON file: it is read back from disk, so it is untrusted until Zod says otherwise.
// It lets the demo run without any Gemini call (the free quota is not guaranteed).

const ids = z.array(z.string().min(1).max(80)).max(60);
const unit = z.number().min(0).max(1);
const plainText = z.string().max(240);
const ChoiceSchema = z
  .object({
    family: z.string().min(1).max(100),
    score: z.number(),
    reasons: z.array(plainText).max(20),
  })
  .strict();

const DirectionSchema = z
  .object({
    sections: z
      .array(
        z
          .object({
            section: GuidelineSectionSchema,
            core: z.boolean(),
            support: unit,
            evidence: ids,
          })
          .strict(),
      )
      .max(30),
    mockups: z
      .array(
        z.object({ subject: z.string().min(1).max(40), support: unit, evidence: ids }).strict(),
      )
      .max(20),
    styles: z.array(z.object({ style: VisualStyleSchema, weight: unit }).strict()).max(30),
    typography: z
      .object({ heading: TypeStyleSchema.optional(), body: TypeStyleSchema.optional() })
      .strict(),
    layout: z
      .object({
        whitespace: z.string().max(40).optional(),
        background: z.string().max(40).optional(),
      })
      .strict(),
    insights: z.array(z.object({ text: plainText, evidence: z.string().max(80) }).strict()).max(10),
    references: z
      .array(
        z
          .object({ id: z.string().min(1).max(80), file: z.string().max(240), score: z.number() })
          .strict(),
      )
      .max(60),
  })
  .strict();

const ResearchSchema = z
  .object({
    reading: LogoReadingSchema,
    direction: DirectionSchema,
    pairings: z
      .array(z.object({ heading: ChoiceSchema, body: ChoiceSchema, score: z.number() }).strict())
      .max(10),
    deepQueries: z.array(z.string().max(200)).max(8),
    warnings: z.array(
      z.enum(['visual-similarity-unavailable', 'library-embedding-mismatch', 'empty-library']),
    ),
    embeddingError: z
      .enum(['AI_QUOTA', 'AI_UNAVAILABLE', 'AI_REQUEST_REJECTED', 'AI_OUTPUT_INVALID'])
      .optional(),
  })
  .strict();

const RecordingSchema = z
  .object({
    version: z.literal(1),
    // Fingerprint of the logo the research was made for, or "*" for a recording valid for any logo.
    key: z.string().regex(/^(\*|[0-9a-f]{16}-[a-z]+)$/),
    recordedAt: z.string().max(40),
    research: ResearchSchema,
  })
  .strict();

export interface ResearchRecording {
  version: 1;
  key: string;
  recordedAt: string;
  research: BrandResearch;
}

// FNV-1a over the bytes (two seeds, 64 bits): identifies a recording's logo, not a security boundary.
export function fingerprintLogo(image: ImageInput): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const byte of image.data) {
    a = Math.imul(a ^ byte, 0x01000193) >>> 0;
    b = Math.imul(b ^ byte, 0x85ebca6b) >>> 0;
  }
  const hex = (value: number): string => value.toString(16).padStart(8, '0');
  return `${hex(a)}${hex(b)}-${image.mimeType.slice(6)}`;
}

export function createRecording(
  research: BrandResearch,
  image: ImageInput,
  recordedAt: string,
): ResearchRecording {
  return { version: 1, key: fingerprintLogo(image), recordedAt, research };
}

export function serializeRecording(recording: ResearchRecording): string {
  return JSON.stringify(recording, null, 2);
}

function direction(value: z.infer<typeof DirectionSchema>): ArtDirection {
  const { heading, body } = value.typography;
  const { whitespace, background } = value.layout;
  return {
    ...value,
    typography: { ...(heading ? { heading } : {}), ...(body ? { body } : {}) },
    layout: { ...(whitespace ? { whitespace } : {}), ...(background ? { background } : {}) },
  };
}

export function parseRecording(text: string): Result<ResearchRecording, string> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return err('recording is not JSON');
  }
  const parsed = RecordingSchema.safeParse(json);
  if (!parsed.success) return err(z.prettifyError(parsed.error).slice(0, 600));
  const { research } = parsed.data;
  return ok({
    version: 1,
    key: parsed.data.key,
    recordedAt: parsed.data.recordedAt,
    research: {
      reading: research.reading,
      direction: direction(research.direction),
      pairings: research.pairings,
      deepQueries: research.deepQueries,
      warnings: research.warnings,
      ...(research.embeddingError ? { embeddingError: research.embeddingError } : {}),
    },
  });
}

export function findRecording(
  recordings: readonly ResearchRecording[],
  image: ImageInput,
): ResearchRecording | undefined {
  const key = fingerprintLogo(image);
  return (
    recordings.find((recording) => recording.key === key) ??
    recordings.find((recording) => recording.key === '*')
  );
}
