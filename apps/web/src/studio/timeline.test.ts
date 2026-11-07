import type { ProjectEvent } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import {
  INITIAL_TIMELINE,
  analysisNotice,
  assetVerdict,
  reduceTimeline,
  timelineStatus,
} from './timeline';

const ASSET = '0190a0b0-0000-7000-8000-000000000001';
const OTHER = '0190a0b0-0000-7000-8000-000000000002';

const step = (n: number, state: 'running' | 'done' | 'failed', code?: string): ProjectEvent => ({
  type: 'analysis.step',
  data: code === undefined ? { step: n, state } : { step: n, state, code },
});
const replay = (events: readonly ProjectEvent[]) => events.reduce(reduceTimeline, INITIAL_TIMELINE);
const states = (events: readonly ProjectEvent[]) => replay(events).steps.map((s) => s.state);

describe('analysis timeline (AC-04.1, AC-04.3)', () => {
  it('starts with four pending steps', () => {
    expect(INITIAL_TIMELINE.steps.map((s) => s.state)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    expect(timelineStatus(INITIAL_TIMELINE)).toBe('idle');
  });

  it('marks earlier steps done and later steps pending when a step runs', () => {
    expect(states([step(1, 'running')])).toEqual(['running', 'pending', 'pending', 'pending']);
    expect(states([step(1, 'running'), step(1, 'done'), step(2, 'running')])).toEqual([
      'done',
      'running',
      'pending',
      'pending',
    ]);
    expect(states([step(3, 'running')])).toEqual(['done', 'done', 'running', 'pending']);
    expect(timelineStatus(replay([step(2, 'running')]))).toBe('running');
  });

  it('keeps the failure code of the failed step and leaves the rest pending', () => {
    const state = replay([step(1, 'done'), step(2, 'running'), step(2, 'failed', 'DECODE')]);
    expect(state.steps.map((s) => s.state)).toEqual(['done', 'failed', 'pending', 'pending']);
    expect(state.steps[1]?.code).toBe('DECODE');
    expect(timelineStatus(state)).toBe('failed');
  });

  it('a retried run replaces the failure (events are replayed in order)', () => {
    const state = replay([step(2, 'failed', 'DECODE'), step(1, 'running')]);
    expect(state.steps.map((s) => s.state)).toEqual(['running', 'pending', 'pending', 'pending']);
    expect(state.steps[1]?.code).toBeUndefined();
    expect(timelineStatus(state)).toBe('running');
  });

  it('ends with every step done and the document revision', () => {
    const state = replay([step(4, 'running'), { type: 'analysis.done', data: { seq: 7 } }]);
    expect(state.steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done']);
    expect(state.seq).toBe(7);
    expect(timelineStatus(state)).toBe('done');
  });

  it('ignores events that are not about the analysis', () => {
    const asset: ProjectEvent = { type: 'asset.status', data: { assetId: ASSET, status: 'clean' } };
    expect(reduceTimeline(INITIAL_TIMELINE, asset)).toBe(INITIAL_TIMELINE);
  });
});

describe('assetVerdict (scan result of the uploaded logo)', () => {
  const status = (
    assetId: string,
    value: 'pending' | 'quarantined' | 'clean' | 'rejected',
  ): ProjectEvent => ({ type: 'asset.status', data: { assetId, status: value } });

  it('reports clean or rejected with its reason, for this asset only', () => {
    expect(assetVerdict(status(ASSET, 'clean'), ASSET)).toEqual({ status: 'clean' });
    expect(
      assetVerdict(
        {
          type: 'asset.status',
          data: { assetId: ASSET, status: 'rejected', rejectReason: 'ASSET_SVG_TOO_COMPLEX' },
        },
        ASSET,
      ),
    ).toEqual({ status: 'rejected', code: 'ASSET_SVG_TOO_COMPLEX' });
    expect(assetVerdict(status(OTHER, 'clean'), ASSET)).toBeNull();
    expect(assetVerdict(status(ASSET, 'quarantined'), ASSET)).toBeNull();
    expect(assetVerdict(step(1, 'running'), ASSET)).toBeNull();
  });

  it('gives a rejection without reason a generic decode failure', () => {
    expect(assetVerdict(status(ASSET, 'rejected'), ASSET)).toEqual({
      status: 'rejected',
      code: 'ASSET_DECODE_FAILED',
    });
  });
});

describe('analysis warnings (degraded mode, step 4 done events)', () => {
  it('keeps the codes of several done events without duplicates, and the step states', () => {
    const run = replay([
      step(1, 'running'),
      step(4, 'running'),
      step(4, 'done', 'RESEARCH_UNAVAILABLE'),
      step(4, 'done', 'DOCUMENT_KEPT'),
      step(4, 'done', 'RESEARCH_UNAVAILABLE'),
      { type: 'analysis.done', data: { seq: 4 } },
    ]);
    expect(run.warnings).toEqual(['RESEARCH_UNAVAILABLE', 'DOCUMENT_KEPT']);
    expect(run.steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done']);
    expect(run.seq).toBe(4);
  });

  it('forgets the warnings of a previous run when a new one starts', () => {
    expect(replay([step(4, 'done', 'RESEARCH_FAILED'), step(1, 'running')]).warnings).toEqual([]);
  });

  it('ignores codes that are not warnings and codes of other steps', () => {
    const run = replay([step(2, 'done', 'RESEARCH_FAILED'), step(4, 'done', 'WHATEVER')]);
    expect(run.warnings).toEqual([]);
  });
});

describe('analysisNotice', () => {
  it('is silent without warnings, for DOCUMENT_KEPT alone and for a recording failure', () => {
    expect(analysisNotice([])).toBeNull();
    expect(analysisNotice(['DOCUMENT_KEPT'])).toBeNull();
    expect(analysisNotice(['RESEARCH_RECORDING_FAILED'])).toBeNull();
  });

  it('announces the standard plan when the research could not run', () => {
    const codes = [
      'RESEARCH_UNAVAILABLE',
      'RESEARCH_FAILED',
      'RESEARCH_PLAN_INVALID',
      'RESEARCH_REPLAY_INVALID',
    ];
    for (const code of codes)
      expect(analysisNotice(['DOCUMENT_KEPT', code]), code).toBe('standard');
  });

  it('announces a partial result for other research warnings', () => {
    expect(analysisNotice(['RESEARCH_SOME_ISSUE'])).toBe('partial');
  });
});
