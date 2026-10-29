export { loadFontCatalogue, type FontFamily } from './fonts/catalogue.js';
export {
  recommendPairings,
  type FontChoice,
  type FontPairing,
  type TypeIntent,
} from './fonts/recommend.js';
export {
  embedImage,
  EMBEDDING_MODEL,
  LogoReadingSchema,
  readLogo,
  type ImageInput,
  type LogoReading,
} from './gemini/logo-reading.js';
export {
  createGeminiTransport,
  type AiError,
  type AiErrorCode,
  type GeminiTransport,
} from './gemini/transport.js';
export {
  buildArtDirection,
  type ArtDirection,
  type PlannedMockup,
  type PlannedSection,
} from './references/direction.js';
export { parseReferenceIndex, type ReferenceIndex } from './references/library.js';
export {
  cosine,
  rankReferences,
  type RankedReference,
  type ResearchQuery,
  type ScoreBreakdown,
} from './references/rank.js';
export {
  buildDeepQueries,
  researchBrand,
  type BrandResearch,
  type ResearchDeps,
  type ResearchInput,
  type ResearchWarning,
} from './research.js';
