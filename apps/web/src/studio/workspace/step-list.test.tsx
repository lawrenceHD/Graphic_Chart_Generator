// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { frMessages, renderFr } from '../intl-test-utils';
import type { Timeline } from '../timeline';
import { StepList } from './copilot-panel';

const done = { state: 'done' } as const;
const timelineWith = (warnings: readonly string[]): Timeline => ({
  steps: [done, done, done, done],
  seq: 3,
  warnings,
});

function show(warnings: readonly string[]): void {
  renderFr(<StepList timeline={timelineWith(warnings)} journal={[]} onRetry={() => undefined} />);
}

afterEach(cleanup);

describe('StepList notice in the studio', () => {
  it('says the guideline uses the standard plan when the research was unavailable', () => {
    show(['RESEARCH_UNAVAILABLE']);
    expect(screen.getByRole('status').textContent).toBe(frMessages.analysis.notice.standard);
  });

  it('says the research was partial for other warnings', () => {
    show(['RESEARCH_FAILED_SOME']);
    expect(screen.getByRole('status').textContent).toBe(frMessages.analysis.notice.partial);
  });

  it.each([[[]], [['DOCUMENT_KEPT']], [['RESEARCH_RECORDING_FAILED']]])(
    'shows nothing for %j',
    (warnings) => {
      show(warnings);
      expect(screen.queryByRole('status')).toBeNull();
    },
  );

  it('keeps the step list', () => {
    show(['RESEARCH_UNAVAILABLE']);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
