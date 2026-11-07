import { ChartPlanSchema, type ChartPlan } from '@app/contracts';
import { standardChartPlan } from '@app/document';
import { err, ok, type Result } from '@app/kernel';

// The research stage of project.analyze: obtains the ChartPlan that drives the pages of the charter. The
// worker is the composition root, so it injects the port; the stage never fails the analysis (see
// `planWithFallback`): it degrades to the standard plan and says so.
export type ResearchErrorCode =
  'RESEARCH_UNAVAILABLE' | 'RESEARCH_FAILED' | 'RESEARCH_PLAN_INVALID' | 'RESEARCH_REPLAY_INVALID';

export interface ResearchError {
  readonly code: ResearchErrorCode;
  readonly message: string;
}

export interface ResearchInput {
  readonly language: 'fr' | 'en';
  readonly brandName: string;
  /** Palette roles of the logo, #RRGGBB, primary first. */
  readonly palette: readonly string[];
}

export interface ResearchPort {
  plan(input: ResearchInput): Promise<Result<ChartPlan, ResearchError>>;
}

/** No research configured: the 16-page standard plan, in the language of the project. */
export const defaultResearch: ResearchPort = {
  plan: (input) => Promise.resolve(ok(standardChartPlan(input.language))),
};

const failure = (code: ResearchErrorCode, message: string): ResearchError => ({ code, message });

/** Replays a recorded plan (demo mode): validated once, then served without any network call. */
export function replayResearch(recorded: unknown): Result<ResearchPort, ResearchError> {
  const plan = ChartPlanSchema.safeParse(recorded);
  if (!plan.success) return err(failure('RESEARCH_REPLAY_INVALID', 'recorded plan is invalid'));
  return ok({ plan: () => Promise.resolve(ok(plan.data)) });
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

type ProducedPlan = Result<unknown, { readonly code: string }>;

/**
 * Adapter for the research of @app/ai: `call` is the function that produces a plan (to be wired once
 * packages/ai exposes it). Its output is untrusted, a throw is a failure, never an exception.
 */
export function aiResearch(call: (input: ResearchInput) => Promise<ProducedPlan>): ResearchPort {
  return {
    plan: async (input) => {
      let produced: ProducedPlan;
      try {
        produced = await call(input);
      } catch {
        return err(failure('RESEARCH_FAILED', 'research threw'));
      }
      if (!produced.ok) return err(failure('RESEARCH_FAILED', produced.error.code));
      const plan = ChartPlanSchema.safeParse(produced.value);
      return plan.success
        ? ok(plan.data)
        : err(failure('RESEARCH_PLAN_INVALID', 'research returned an invalid plan'));
    },
  };
}

export interface ResearchOutcome {
  readonly plan: ChartPlan;
  /** Set when the plan is the standard one because research failed: reported in the project events. */
  readonly warning?: ResearchErrorCode;
}

/** Degraded mode: a failing, throwing or invalid research yields the standard plan plus a typed warning. */
export async function planWithFallback(
  port: ResearchPort,
  input: ResearchInput,
): Promise<ResearchOutcome> {
  const standard = (warning: ResearchErrorCode): ResearchOutcome => ({
    plan: standardChartPlan(input.language),
    warning,
  });
  let produced: Result<ChartPlan, ResearchError>;
  try {
    produced = await port.plan(input);
  } catch {
    return standard('RESEARCH_FAILED');
  }
  if (!produced.ok) return standard(produced.error.code);
  const plan = ChartPlanSchema.safeParse(produced.value);
  return plan.success ? { plan: plan.data } : standard('RESEARCH_PLAN_INVALID');
}
