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
export { canonicalMockup } from './references/mockups.js';
export { sectorAffinity } from './references/sectors.js';
export {
  deriveLibraryStats,
  type LibraryStats,
  type SectorStats,
  type Share,
} from './references/stats.js';
export {
  createPacer,
  extractPreviewImage,
  MAX_ON_DEMAND_REFERENCES,
  onDemandQueries,
  parseSourceLink,
  referenceFileName,
  type OnDemandTask,
  type SourceLink,
  type SourceLinkError,
} from './references/on-demand.js';
export {
  cosine,
  rankReferences,
  type RankedReference,
  type ResearchQuery,
  type ScoreBreakdown,
  type SearchPurpose,
} from './references/rank.js';
export {
  buildDeepQueries,
  researchBrand,
  type BrandResearch,
  type ResearchDeps,
  type ResearchInput,
  type ResearchWarning,
} from './research.js';
export {
  analyzeBrand,
  BrandAnalysisSchema,
  escapeData,
  type AnalyzeInput,
  type BrandAnalysis,
} from './gemini/brand-analysis.js';
export { defaultChartPlan, directionToChartPlan, SECTION_PAGE_TYPE } from './plan/chart-plan.js';
export {
  createRecording,
  findRecording,
  fingerprintLogo,
  parseRecording,
  serializeRecording,
  type ResearchRecording,
} from './replay/recording.js';
export {
  runResearch,
  type ResearchIssue,
  type ResearchIssueCode,
  type ResearchOutcome,
  type ResearchSource,
  type RunResearchDeps,
  type RunResearchInput,
} from './run-research.js';
export {
  DEFAULT_BUDGET,
  withBudget,
  type BudgetedTransport,
  type BudgetLimits,
} from './safety/budget.js';
export { looksLikeInjection, sanitizeUntrusted } from './safety/untrusted.js';
