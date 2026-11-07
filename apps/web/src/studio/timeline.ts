import type { AssetErrorCode, ProjectEvent } from '@app/contracts';

// The 4-step analysis timeline (AC-04.1, 09_DESIGN_SYSTEM.md §7) folded from the project's SSE events.
// The stream replays the log in order, so folding every event yields the state of the latest run.
export type StepState = 'pending' | 'running' | 'done' | 'failed';

export interface TimelineStep {
  readonly state: StepState;
  /** Failure code of the step (04 §5), translated by the interface. */
  readonly code?: string;
}

export interface Timeline {
  readonly steps: readonly TimelineStep[];
  /** Document revision once the analysis is done. */
  readonly seq?: number;
  /** Warnings of the latest run, from the `done` events of step 4 (research degraded, document kept). */
  readonly warnings: readonly string[];
}

export const ANALYSIS_STEPS = 4;
const WARNING_STEP = 4;

const steps = (state: (index: number) => TimelineStep): readonly TimelineStep[] =>
  Array.from({ length: ANALYSIS_STEPS }, (_, index) => state(index));

export const INITIAL_TIMELINE: Timeline = {
  steps: steps(() => ({ state: 'pending' })),
  warnings: [],
};

const isWarningCode = (code: string): boolean =>
  code.startsWith('RESEARCH_') || code === 'DOCUMENT_KEPT';

export function reduceTimeline(timeline: Timeline, event: ProjectEvent): Timeline {
  if (event.type === 'analysis.done') {
    return {
      steps: steps(() => ({ state: 'done' })),
      seq: event.data.seq,
      warnings: timeline.warnings,
    };
  }
  if (event.type !== 'analysis.step') return timeline;
  const current = event.data.step - 1;
  const { state, code } = event.data;
  const newRun = event.data.step === 1 && state === 'running';
  const base = newRun ? [] : timeline.warnings;
  const warnings =
    event.data.step === WARNING_STEP &&
    state === 'done' &&
    code !== undefined &&
    isWarningCode(code) &&
    !base.includes(code)
      ? [...base, code]
      : base;
  return {
    warnings,
    steps: steps((index): TimelineStep => {
      if (index < current) return { state: 'done' };
      if (index > current) return { state: 'pending' };
      return state === 'failed' && code !== undefined ? { state, code } : { state };
    }),
  };
}

/** Warnings that mean the research could not run: the guideline falls back to the standard plan. */
const STANDARD_PLAN_CODES = [
  'RESEARCH_UNAVAILABLE',
  'RESEARCH_FAILED',
  'RESEARCH_PLAN_INVALID',
  'RESEARCH_REPLAY_INVALID',
];
/** Warnings that change nothing for the person: the document kept, a recording that was not saved. */
const SILENT_CODES = ['DOCUMENT_KEPT', 'RESEARCH_RECORDING_FAILED'];

export type AnalysisNotice = 'standard' | 'partial';

/** What the banner says, or null when the run needs no notice. */
export function analysisNotice(warnings: readonly string[]): AnalysisNotice | null {
  if (warnings.some((code) => STANDARD_PLAN_CODES.includes(code))) return 'standard';
  return warnings.some((code) => !SILENT_CODES.includes(code)) ? 'partial' : null;
}

export type TimelineStatus = 'idle' | 'running' | 'failed' | 'done';

export function timelineStatus(timeline: Timeline): TimelineStatus {
  if (timeline.seq !== undefined) return 'done';
  if (timeline.steps.some((step) => step.state === 'failed')) return 'failed';
  return timeline.steps.every((step) => step.state === 'pending') ? 'idle' : 'running';
}

export type AssetVerdict =
  { readonly status: 'clean' } | { readonly status: 'rejected'; readonly code: AssetErrorCode };

/** Final scan result of one asset, or null while it is not decided (or the event is about another one). */
export function assetVerdict(event: ProjectEvent, assetId: string): AssetVerdict | null {
  if (event.type !== 'asset.status' || event.data.assetId !== assetId) return null;
  if (event.data.status === 'clean') return { status: 'clean' };
  if (event.data.status !== 'rejected') return null;
  return { status: 'rejected', code: event.data.rejectReason ?? 'ASSET_DECODE_FAILED' };
}
