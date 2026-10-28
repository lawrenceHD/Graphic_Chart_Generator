'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../components/button';
import { timelineStatus, type StepState, type Timeline } from './timeline';

// Timeline of the studio mock-up (prototypes/studio, Studio.tsx `Timeline` and `StepRow`), fed by the
// real SSE events (AC-04.1). State = icon + words + colour, never colour alone (09 §5).
const STEP_KEYS = ['read', 'palette', 'write', 'assemble'] as const;

const MARK: Record<StepState, string> = {
  pending: 'border-line-strong text-ink-3',
  running: 'border-accent text-accent',
  done: 'border-success bg-success text-canvas',
  failed: 'border-danger bg-danger text-canvas',
};

function StepMark({ state }: { readonly state: StepState }) {
  return (
    <span
      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${MARK[state]}`}
    >
      {state === 'pending' ? null : (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-3 ${state === 'running' ? 'animate-spin motion-reduce:animate-none' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={
              state === 'done'
                ? 'M4 10.5 8 14.5 16 6'
                : state === 'failed'
                  ? 'M6 6l8 8 M14 6l-8 8'
                  : 'M10 3a7 7 0 1 1-7 7'
            }
          />
        </svg>
      )}
    </span>
  );
}

export function AnalysisTimeline({
  timeline,
  onRetry,
}: {
  readonly timeline: Timeline;
  readonly onRetry: () => void;
}) {
  const t = useTranslations('analysis');
  const status = timelineStatus(timeline);
  const current = timeline.steps.findIndex(
    (step) => step.state === 'running' || step.state === 'failed',
  );
  const failed = timeline.steps[current]?.state === 'failed' ? timeline.steps[current] : undefined;
  const currentKey = STEP_KEYS[current];
  const announce =
    status === 'done'
      ? t('announce.done')
      : currentKey === undefined
        ? t('announce.idle')
        : failed === undefined
          ? t(`steps.${currentKey}`)
          : `${t(`steps.${currentKey}`)} ${t('state.failed')}`;

  return (
    <section aria-labelledby="analysis-title" className="flex flex-col gap-3">
      <h2 id="analysis-title" className="m-0 text-sm font-semibold">
        {t('title')}
      </h2>
      <p data-testid="analysis-live" aria-live="polite" className="sr-only">
        {announce}
      </p>
      <ol className="m-0 list-none space-y-1 p-0">
        {timeline.steps.map((step, index) => {
          const key = STEP_KEYS[index] ?? 'assemble';
          return (
            <li
              key={key}
              aria-current={step.state === 'running' ? 'step' : undefined}
              className={`flex items-start gap-3 rounded-md px-3 py-2.5 ${step.state === 'running' ? 'bg-elevated' : ''}`}
            >
              <StepMark state={step.state} />
              <div className="min-w-0">
                <p
                  className={`m-0 text-sm ${step.state === 'pending' ? 'text-ink-3' : 'text-ink'}`}
                >
                  {t(`steps.${key}`)}
                </p>
                <p className="m-0 text-xs text-ink-3">{t(`state.${step.state}`)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {failed === undefined ? null : (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="m-0 text-sm text-danger">
            {t('failed', { code: failed.code ?? 'UNKNOWN' })}
          </p>
          <Button onClick={onRetry}>{t('retry')}</Button>
        </div>
      )}
    </section>
  );
}
