import { ChartPlanSchema, type ChartPlan } from '@app/contracts';
import { standardChartPlan } from '@app/document';
import type { ResearchOutcome as AiOutcome, ResearchRecording, RunResearchInput } from '@app/ai';
import { err, ok, type Result } from '@app/kernel';

// The research stage of project.analyze: obtains the ChartPlan that drives the pages of the charter. The
// worker is the composition root, so it injects the port; the stage never fails the analysis (see
// `planWithFallback`): it degrades to the standard plan and says so.
export type ResearchErrorCode =
  'RESEARCH_UNAVAILABLE' | 'RESEARCH_FAILED' | 'RESEARCH_PLAN_INVALID' | 'RESEARCH_REPLAY_INVALID';

const eventCode = (issue: string): string => {
  const code = issue.toUpperCase().replaceAll('-', '_');
  return code.startsWith('RESEARCH_') ? code : `RESEARCH_${code}`;
};

export interface ResearchError {
  readonly code: ResearchErrorCode;
  readonly message: string;
}

export interface ResearchInput {
  readonly language: 'fr' | 'en';
  readonly brandName: string;
  /** Palette roles of the logo, #RRGGBB, primary first. */
  readonly palette: readonly string[];
  /** The logo as a PNG, for the AI research; absent when it could not be rendered. */
  readonly logo?: { readonly data: Uint8Array; readonly mimeType: 'image/png' };
}

/** A plan and the warnings of its making (`RESEARCH_*` codes, reported in the events of the project). */
export interface ResearchResult {
  readonly plan: ChartPlan;
  readonly warnings: readonly string[];
}

export interface ResearchPort {
  plan(input: ResearchInput): Promise<Result<ResearchResult, ResearchError>>;
}

/** No research configured: the 16-page standard plan, in the language of the project. */
export const defaultResearch: ResearchPort = {
  plan: (input) => Promise.resolve(ok({ plan: standardChartPlan(input.language), warnings: [] })),
};

const failure = (code: ResearchErrorCode, message: string): ResearchError => ({ code, message });

/** Replays a recorded plan (demo mode): validated once, then served without any network call. */
export function replayResearch(recorded: unknown): Result<ResearchPort, ResearchError> {
  const plan = ChartPlanSchema.safeParse(recorded);
  if (!plan.success) return err(failure('RESEARCH_REPLAY_INVALID', 'recorded plan is invalid'));
  return ok({ plan: () => Promise.resolve(ok({ plan: plan.data, warnings: [] })) });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Reads a recorded plan through an injected reader (the worker has the disk, this module does not). */
export async function loadRecordedResearch(
  read: (path: string) => Promise<string>,
  path: string,
): Promise<Result<ResearchPort, ResearchError>> {
  let text: string;
  try {
    text = await read(path);
  } catch {
    return err(failure('RESEARCH_REPLAY_INVALID', 'recorded plan is unreadable'));
  }
  return replayResearch(parseJson(text));
}

export interface AiResearchOptions {
  /** `runResearch` of @app/ai with its dependencies bound (transport, catalogue, corpus, clock). */
  readonly run: (input: RunResearchInput) => Promise<Result<AiOutcome, { readonly code: string }>>;
  /** Keeps the recording of a fresh live research (demo plans); a failure is a warning. */
  readonly record?: (recording: ResearchRecording) => Promise<void>;
}

/**
 * Adapter for the research of @app/ai. Its output is untrusted (the plan is validated again), a throw is
 * a failure, never an exception; each typed issue of the outcome becomes a warning.
 */
export function aiResearch(options: AiResearchOptions): ResearchPort {
  return {
    plan: async (input) => {
      if (input.logo === undefined) {
        return err(failure('RESEARCH_UNAVAILABLE', 'logo could not be rendered'));
      }
      let produced: Result<AiOutcome, { readonly code: string }>;
      try {
        produced = await options.run({ logo: input.logo, palette: [...input.palette] });
      } catch {
        return err(failure('RESEARCH_FAILED', 'research threw'));
      }
      if (!produced.ok) return err(failure('RESEARCH_FAILED', produced.error.code));
      const plan = ChartPlanSchema.safeParse(produced.value.plan);
      if (!plan.success) {
        return err(failure('RESEARCH_PLAN_INVALID', 'research returned an invalid plan'));
      }
      const warnings = produced.value.issues.map((issue) => eventCode(issue.code));
      const { recording } = produced.value;
      if (produced.value.source === 'live' && recording !== undefined && options.record) {
        try {
          await options.record(recording);
        } catch {
          warnings.push('RESEARCH_RECORDING_FAILED');
        }
      }
      return ok({ plan: plan.data, warnings });
    },
  };
}

export interface PlanOutcome {
  readonly plan: ChartPlan;
  /** Typed warnings, most important first; the standard plan is used when research failed. */
  readonly warnings: readonly string[];
}

/** Degraded mode: a failing, throwing or invalid research yields the standard plan plus a typed warning. */
export async function planWithFallback(
  port: ResearchPort,
  input: ResearchInput,
): Promise<PlanOutcome> {
  const standard = (warning: string): PlanOutcome => ({
    plan: standardChartPlan(input.language),
    warnings: [warning],
  });
  let produced: Result<ResearchResult, ResearchError>;
  try {
    produced = await port.plan(input);
  } catch {
    return standard('RESEARCH_FAILED');
  }
  if (!produced.ok) return standard(produced.error.code);
  const plan = ChartPlanSchema.safeParse(produced.value.plan);
  return plan.success
    ? { plan: plan.data, warnings: produced.value.warnings }
    : standard('RESEARCH_PLAN_INVALID');
}
