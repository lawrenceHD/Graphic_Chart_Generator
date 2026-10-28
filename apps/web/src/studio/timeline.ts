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
}

export const ANALYSIS_STEPS = 4;

const steps = (state: (index: number) => TimelineStep): readonly TimelineStep[] =>
  Array.from({ length: ANALYSIS_STEPS }, (_, index) => state(index));

export const INITIAL_TIMELINE: Timeline = { steps: steps(() => ({ state: 'pending' })) };

export function reduceTimeline(timeline: Timeline, event: ProjectEvent): Timeline {
  if (event.type === 'analysis.done') {
    return { steps: steps(() => ({ state: 'done' })), seq: event.data.seq };
  }
  if (event.type !== 'analysis.step') return timeline;
  const current = event.data.step - 1;
  const { state, code } = event.data;
  return {
    steps: steps((index): TimelineStep => {
      if (index < current) return { state: 'done' };
      if (index > current) return { state: 'pending' };
      return state === 'failed' && code !== undefined ? { state, code } : { state };
    }),
  };
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
