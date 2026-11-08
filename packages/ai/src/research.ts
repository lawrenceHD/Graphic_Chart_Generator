import { HexColor, type IndexedReference, type TypeStyle } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { FontFamily } from './fonts/catalogue.js';
import { recommendPairings, type FontPairing, type TextStyle } from './fonts/recommend.js';
import {
  EMBEDDING_MODEL,
  embedImage,
  readLogo,
  type ImageInput,
  type LogoReading,
} from './gemini/logo-reading.js';
import type { AiError, AiErrorCode, GeminiTransport } from './gemini/transport.js';
import { buildArtDirection, type ArtDirection } from './references/direction.js';
import { rankReferences, type SearchPurpose } from './references/rank.js';

export interface ResearchDeps {
  transport: GeminiTransport;
  visionModel: string;
  library: readonly IndexedReference[];
  catalogue: readonly FontFamily[];
}

export interface ResearchInput {
  logo: ImageInput;
  // Palette extracted from the logo by color-engine.
  palette: string[];
  // What the references are for (default 'charter': guideline spreads and brand boards weigh most).
  purpose?: SearchPurpose;
}

export type ResearchWarning =
  | 'visual-similarity-unavailable'
  | 'library-embedding-mismatch'
  | 'empty-library'
  // The library holds no reference of the brand's sector: sector similarity then rests on related sectors only.
  | 'sector-not-indexed';

export interface BrandResearch {
  reading: LogoReading;
  direction: ArtDirection;
  pairings: FontPairing[];
  // Specific queries for the on-demand deep search (tools/references/collect.py --live).
  deepQueries: string[];
  warnings: ResearchWarning[];
  // Why the logo could not be embedded, when it could not.
  embeddingError?: AiErrorCode;
}

const REFERENCE_COUNT = 12;
const PaletteSchema = z.array(HexColor).max(16);
const MAX_QUERIES = 8;
const DEEP_MOCKUPS = 3;

const words = (id: string): string => id.replaceAll('-', ' ');
const textStyle = (style: TypeStyle | undefined): TextStyle | undefined =>
  style === 'none' ? undefined : style;

export function buildDeepQueries(reading: LogoReading, mockups: readonly string[]): string[] {
  const sector = reading.sector === 'other' ? '' : words(reading.sector);
  const style = reading.styles[0] ?? '';
  const join = (...parts: string[]): string => parts.filter(Boolean).join(' ').trim();
  const queries = [
    join(sector, 'brand identity', style),
    join(sector, 'brand guidelines'),
    ...mockups.slice(0, DEEP_MOCKUPS).map((mockup) => join(mockup, 'mockup', style, sector)),
    reading.letteringType === 'none'
      ? ''
      : join(words(reading.letteringType), 'logo brand identity', sector),
    ...reading.searchKeywords.map((keyword) => join(keyword.toLowerCase(), 'branding')),
  ];
  return [...new Set(queries.filter((query) => query.split(' ').length >= 2))].slice(
    0,
    MAX_QUERIES,
  );
}

export async function researchBrand(
  deps: ResearchDeps,
  input: ResearchInput,
): Promise<Result<BrandResearch, AiError>> {
  const palette = PaletteSchema.safeParse(input.palette);
  if (!palette.success) {
    return err({ code: 'AI_REQUEST_REJECTED', message: 'palette must be #RRGGBB colours' });
  }
  const warnings: ResearchWarning[] = [];
  // The logo can only be compared with references embedded by the same model at the same size.
  const comparable = deps.library.filter(
    (reference) =>
      reference.model.embedding === EMBEDDING_MODEL &&
      reference.embedding.length === deps.library[0]?.embedding.length,
  );
  const dimensions = comparable[0]?.embedding.length;
  if (deps.library.length === 0) warnings.push('empty-library');
  else if (dimensions === undefined) warnings.push('library-embedding-mismatch');
  const [reading, embedding] = await Promise.all([
    readLogo(deps.transport, input.logo, deps.visionModel),
    dimensions === undefined ? undefined : embedImage(deps.transport, input.logo, dimensions),
  ]);
  if (!reading.ok) return reading;
  if (embedding && !embedding.ok) warnings.push('visual-similarity-unavailable');
  if (
    deps.library.length > 0 &&
    reading.value.sector !== 'other' &&
    !deps.library.some((reference) => reference.sector === reading.value.sector)
  ) {
    warnings.push('sector-not-indexed');
  }

  const ranked = rankReferences(
    {
      sector: reading.value.sector,
      styles: reading.value.styles,
      palette: palette.data,
      ...(embedding?.ok ? { logoEmbedding: embedding.value } : {}),
    },
    deps.library,
    { limit: REFERENCE_COUNT, purpose: input.purpose ?? 'charter' },
  );
  const direction = buildArtDirection(ranked);
  const lettering = reading.value.letteringType;
  const pairings = recommendPairings(
    {
      heading: textStyle(direction.typography.heading) ?? textStyle(lettering) ?? 'grotesque-sans',
      body: textStyle(direction.typography.body) ?? 'humanist-sans',
      styles: reading.value.styles,
      // The logo's own lettering stays the logo's: the guideline typefaces complement it.
      avoid: reading.value.typefaceGuess ? [reading.value.typefaceGuess] : [],
    },
    deps.catalogue,
  );
  return ok({
    reading: reading.value,
    direction,
    pairings,
    deepQueries: buildDeepQueries(
      reading.value,
      direction.mockups.map((mockup) => mockup.subject),
    ),
    warnings,
    ...(embedding && !embedding.ok ? { embeddingError: embedding.error.code } : {}),
  });
}
