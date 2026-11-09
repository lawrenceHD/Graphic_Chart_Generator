import { HexColor, type ChartPlan, type IndexedReference } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { FontFamily } from './fonts/catalogue.js';
import type { ImageInput } from './gemini/logo-reading.js';
import type { AiError, GeminiTransport } from './gemini/transport.js';
import { defaultChartPlan, planFromDirection } from './plan/chart-plan.js';
import { parseReferenceIndex } from './references/library.js';
import { createRecording, findRecording, type ResearchRecording } from './replay/recording.js';
import { researchBrand, type BrandResearch } from './research.js';
import { DEFAULT_BUDGET, withBudget, type BudgetLimits } from './safety/budget.js';
import { looksLikeInjection, sanitizeUntrusted } from './safety/untrusted.js';

// The pipeline-facing entry point of the research (docs/team/QUEUE.md). It never fails because of the AI or
// the library: every degradation is returned as a typed issue next to a usable plan.

export type ResearchIssueCode =
  | 'visual-similarity-unavailable'
  | 'reference-index-missing'
  | 'reference-lines-rejected'
  | 'empty-library'
  | 'sector-not-indexed'
  | 'library-embedding-mismatch'
  | 'research-failed'
  | 'recording-missing'
  | 'replayed'
  | 'replayed-after-failure'
  | 'prompt-injection-suspected'
  | 'plan-invalid'
  | 'plan-capped'
  | 'replayed-wildcard'
  | 'recording-failed';

export interface ResearchIssue {
  code: ResearchIssueCode;
  detail?: string;
}

export type ResearchSource = 'live' | 'replay' | 'default';

export interface ResearchOutcome {
  source: ResearchSource;
  plan: ChartPlan;
  // Absent when neither the live research nor a recording produced one.
  research?: BrandResearch;
  issues: ResearchIssue[];
  // A fresh live research, ready to be saved with serializeRecording (needs `now`).
  recording?: ResearchRecording;
  usage: { calls: number; inputChars: number };
}

export interface RunResearchDeps {
  transport: GeminiTransport;
  visionModel: string;
  catalogue: readonly FontFamily[];
  // Content of the index.jsonl of the private library (corpus-reel, outside Git); undefined when absent.
  readIndex: () => Promise<string | undefined>;
  // 'replay' never touches the network. Default 'live'.
  mode?: 'live' | 'replay';
  recordings?: readonly ResearchRecording[];
  budget?: BudgetLimits;
  // ISO date for new recordings (the clock is injected, never read here).
  now?: () => string;
}

export interface RunResearchInput {
  logo: ImageInput;
  palette: string[];
}

const PaletteSchema = z.array(HexColor).max(16);
const NO_USAGE = { calls: 0, inputChars: 0 };
const INSIGHT_MAX = 240;

function addIssue(issues: ResearchIssue[], issue: ResearchIssue): void {
  if (!issues.some((existing) => existing.code === issue.code)) issues.push(issue);
}

// Insights come from text read in third-party images: instruction-like ones are dropped, the rest is flattened.
function cleanDirection(research: BrandResearch, issues: ResearchIssue[]): BrandResearch {
  const dropped: string[] = [];
  const insights = research.direction.insights.flatMap((insight) => {
    if (looksLikeInjection(insight.text)) {
      dropped.push(insight.evidence);
      return [];
    }
    return [{ ...insight, text: sanitizeUntrusted(insight.text, INSIGHT_MAX) }];
  });
  if (dropped.length > 0) {
    addIssue(issues, { code: 'prompt-injection-suspected', detail: dropped.join(',') });
  }
  return { ...research, direction: { ...research.direction, insights } };
}

// The plan of a sourced direction; an empty or refused one falls back to the default plan, visibly.
function sourcedPlan(research: BrandResearch, issues: ResearchIssue[]): ChartPlan {
  const { plan, degraded, capped } = planFromDirection(research.direction);
  if (degraded) addIssue(issues, { code: 'plan-invalid' });
  if (capped > 0) addIssue(issues, { code: 'plan-capped', detail: String(capped) });
  return plan;
}

function replayed(recording: ResearchRecording, issues: ResearchIssue[]): ResearchOutcome {
  // A wildcard recording was made for another logo: the result is usable but must not pass for this brand's.
  if (recording.key === '*') addIssue(issues, { code: 'replayed-wildcard' });
  const research = cleanDirection(recording.research, issues);
  return {
    source: 'replay',
    plan: sourcedPlan(research, issues),
    research,
    issues,
    usage: NO_USAGE,
  };
}

// The clock is injected, so it may throw; nothing else here can: cleanDirection, createRecording,
// parseReferenceIndex and the plan builders only run total string and Zod operations.
function makeRecording(
  deps: RunResearchDeps,
  research: BrandResearch,
  logo: ImageInput,
  issues: ResearchIssue[],
): ResearchRecording | undefined {
  if (!deps.now) return undefined;
  try {
    return createRecording(research, logo, deps.now());
  } catch (error) {
    addIssue(issues, {
      code: 'recording-failed',
      detail: error instanceof Error ? error.name : 'unexpected failure',
    });
    return undefined;
  }
}

function degraded(
  issues: ResearchIssue[],
  usage: ResearchOutcome['usage'],
  research?: BrandResearch,
): ResearchOutcome {
  return {
    source: 'default',
    plan: defaultChartPlan(),
    ...(research ? { research } : {}),
    issues,
    usage,
  };
}

async function loadLibrary(
  deps: RunResearchDeps,
  issues: ResearchIssue[],
): Promise<IndexedReference[]> {
  let text: string | undefined;
  try {
    text = await deps.readIndex();
  } catch (error) {
    addIssue(issues, {
      code: 'reference-index-missing',
      detail: error instanceof Error ? error.name : 'unreadable',
    });
    addIssue(issues, { code: 'visual-similarity-unavailable' });
    return [];
  }
  if (text === undefined) {
    addIssue(issues, { code: 'reference-index-missing' });
    addIssue(issues, { code: 'visual-similarity-unavailable' });
    return [];
  }
  const index = parseReferenceIndex(text);
  if (index.rejected.length > 0) {
    addIssue(issues, {
      code: 'reference-lines-rejected',
      detail: `${String(index.rejected.length)} (lines ${index.rejected.slice(0, 10).join(',')})`,
    });
  }
  return index.references;
}

export async function runResearch(
  deps: RunResearchDeps,
  input: RunResearchInput,
): Promise<Result<ResearchOutcome, AiError>> {
  const palette = PaletteSchema.safeParse(input.palette);
  if (!palette.success) {
    return err({ code: 'AI_REQUEST_REJECTED', message: 'palette must be #RRGGBB colours' });
  }
  const issues: ResearchIssue[] = [];
  const recording = findRecording(deps.recordings ?? [], input.logo);

  if (deps.mode === 'replay') {
    if (!recording) {
      addIssue(issues, { code: 'recording-missing' });
      return ok(degraded(issues, NO_USAGE));
    }
    addIssue(issues, { code: 'replayed', detail: recording.recordedAt });
    return ok(replayed(recording, issues));
  }

  const library = await loadLibrary(deps, issues);
  if (library.length === 0) {
    addIssue(issues, { code: 'visual-similarity-unavailable' });
    if (!issues.some((issue) => issue.code === 'reference-index-missing')) {
      addIssue(issues, { code: 'empty-library' });
    }
  }
  const budget = withBudget(deps.transport, deps.budget ?? DEFAULT_BUDGET);
  let result: Awaited<ReturnType<typeof researchBrand>>;
  try {
    result = await researchBrand(
      {
        transport: budget.transport,
        visionModel: deps.visionModel,
        library,
        catalogue: deps.catalogue,
      },
      { logo: input.logo, palette: palette.data },
    );
  } catch (error) {
    result = err({
      code: 'AI_UNAVAILABLE',
      message: error instanceof Error ? error.name : 'unexpected failure',
    });
  }
  const usage = budget.usage();

  if (!result.ok) {
    addIssue(issues, { code: 'research-failed', detail: result.error.code });
    if (recording) {
      addIssue(issues, { code: 'replayed-after-failure', detail: recording.recordedAt });
      return ok(replayed(recording, issues));
    }
    return ok(degraded(issues, usage));
  }

  const research = cleanDirection(result.value, issues);
  for (const warning of research.warnings) {
    addIssue(issues, {
      code: warning,
      ...(warning === 'visual-similarity-unavailable' && research.embeddingError
        ? { detail: research.embeddingError }
        : {}),
    });
  }
  if (library.length === 0) return ok(degraded(issues, usage, research));
  const saved = makeRecording(deps, research, input.logo, issues);
  return ok({
    source: 'live',
    plan: sourcedPlan(research, issues),
    research,
    issues,
    ...(saved ? { recording: saved } : {}),
    usage,
  });
}
