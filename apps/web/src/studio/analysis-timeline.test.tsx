// @vitest-environment jsdom
import type { ProjectEvent } from '@app/contracts';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisTimeline } from './analysis-timeline';
import { frMessages, renderFr } from './intl-test-utils';
import { INITIAL_TIMELINE, reduceTimeline } from './timeline';

const t = frMessages.analysis;
const fold = (...events: ProjectEvent[]) => events.reduce(reduceTimeline, INITIAL_TIMELINE);
const step = (n: number, state: 'running' | 'done' | 'failed', code?: string): ProjectEvent => ({
  type: 'analysis.step',
  data: code === undefined ? { step: n, state } : { step: n, state, code },
});

afterEach(cleanup);

describe('AnalysisTimeline (AC-04.1 to AC-04.3)', () => {
  it('lists the four steps in order with their state in words', () => {
    renderFr(<AnalysisTimeline timeline={fold(step(2, 'running'))} onRetry={vi.fn()} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      `${t.steps.read}${t.state.done}`,
      `${t.steps.palette}${t.state.running}`,
      `${t.steps.write}${t.state.pending}`,
      `${t.steps.assemble}${t.state.pending}`,
    ]);
    expect(items[1]?.getAttribute('aria-current')).toBe('step');
  });

  it('announces the running step, then the end, in a polite live region', () => {
    const { rerender } = renderFr(
      <AnalysisTimeline timeline={fold(step(3, 'running'))} onRetry={vi.fn()} />,
    );
    const live = screen.getByTestId('analysis-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe(t.steps.write);
    rerender(
      <AnalysisTimeline
        timeline={fold({ type: 'analysis.done', data: { seq: 3 } })}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId('analysis-live').textContent).toBe(t.announce.done);
  });

  it('explains a failed step and offers a retry', async () => {
    const onRetry = vi.fn();
    renderFr(
      <AnalysisTimeline timeline={fold(step(2, 'failed', 'DECODE_FAILED'))} onRetry={onRetry} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('DECODE_FAILED');
    expect(screen.getAllByText(t.state.failed)).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: t.retry }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('offers no retry while the analysis runs', () => {
    renderFr(<AnalysisTimeline timeline={fold(step(1, 'running'))} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: t.retry })).toBeNull();
  });
});

describe('AnalysisTimeline degraded-mode notice', () => {
  const run = (...codes: string[]) =>
    fold(step(1, 'running'), ...codes.map((code) => step(4, 'done', code)), {
      type: 'analysis.done',
      data: { seq: 2 },
    });

  it('says honestly that the guideline uses the standard plan, in a small status, not an alert', () => {
    renderFr(<AnalysisTimeline timeline={run('RESEARCH_UNAVAILABLE')} onRetry={vi.fn()} />);
    const notice = screen.getByTestId('analysis-notice');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toContain(t.notice.standard);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(notice.getAttribute('aria-live')).toBeNull();
  });

  it('shows nothing for DOCUMENT_KEPT alone', () => {
    renderFr(<AnalysisTimeline timeline={run('DOCUMENT_KEPT')} onRetry={vi.fn()} />);
    expect(screen.queryByTestId('analysis-notice')).toBeNull();
  });
});
