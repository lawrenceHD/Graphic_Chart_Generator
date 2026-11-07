import type { ChartPlan } from '@app/contracts';
import { standardChartPlan } from '@app/document';
import { err, ok } from '@app/kernel';
import { describe, expect, it } from 'vitest';
import {
  aiResearch,
  defaultResearch,
  loadRecordedResearch,
  planWithFallback,
  replayResearch,
  type ResearchInput,
  type ResearchPort,
} from './research.js';

const input: ResearchInput = { language: 'fr', brandName: 'Atelier', palette: ['#1F4BFF'] };
const recorded: ChartPlan = {
  sections: [
    { type: 'cover', title: 'Couverture', evidence: [] },
    { type: 'logo', title: 'Le logo', evidence: ['ref-1'] },
  ],
};

describe('research port', () => {
  it('defaultResearch returns the 16-page standard plan in the project language', async () => {
    const fr = await defaultResearch.plan(input);
    expect(fr).toEqual({ ok: true, value: standardChartPlan('fr') });
    const en = await defaultResearch.plan({ ...input, language: 'en' });
    expect(en.ok && en.value.sections).toHaveLength(16);
    expect(en.ok && en.value.sections[0]?.title).toBe('Cover');
  });

  it('replays a recorded plan without calling anything', async () => {
    const port = replayResearch(recorded);
    expect(port.ok).toBe(true);
    if (!port.ok) return;
    expect(await port.value.plan(input)).toEqual({ ok: true, value: recorded });
  });

  it('refuses a recorded plan that ChartPlanSchema rejects', () => {
    const port = replayResearch({ sections: [{ type: 'nope', title: 'x', evidence: [] }] });
    expect(port).toMatchObject({ ok: false, error: { code: 'RESEARCH_REPLAY_INVALID' } });
  });

  it('loads a recorded plan through the injected reader, and reports bad files', async () => {
    const good = await loadRecordedResearch(() => Promise.resolve(JSON.stringify(recorded)), 'p');
    expect(good.ok).toBe(true);
    const notJson = await loadRecordedResearch(() => Promise.resolve('{oops'), 'p');
    expect(notJson).toMatchObject({ ok: false, error: { code: 'RESEARCH_REPLAY_INVALID' } });
    const missing = await loadRecordedResearch(() => Promise.reject(new Error('ENOENT')), 'p');
    expect(missing).toMatchObject({ ok: false, error: { code: 'RESEARCH_REPLAY_INVALID' } });
  });

  it('the AI adapter validates the output and turns failures into errors', async () => {
    const good = aiResearch(() => Promise.resolve(ok(recorded)));
    expect(await good.plan(input)).toEqual({ ok: true, value: recorded });
    const invalid = aiResearch(() => Promise.resolve(ok({ sections: [] })));
    expect(await invalid.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_PLAN_INVALID' },
    });
    const failed = aiResearch(() => Promise.resolve(err({ code: 'AI_RATE_LIMITED' })));
    expect(await failed.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_FAILED' },
    });
    const thrown = aiResearch(() => Promise.reject(new Error('network')));
    expect(await thrown.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_FAILED' },
    });
  });
});

describe('planWithFallback (degraded mode)', () => {
  const port = (plan: ResearchPort['plan']): ResearchPort => ({ plan });

  it('keeps the researched plan, without warning', async () => {
    const outcome = await planWithFallback(
      port(() => Promise.resolve(ok(recorded))),
      input,
    );
    expect(outcome).toEqual({ plan: recorded });
  });

  it('falls back to the standard plan with the typed warning of the failure', async () => {
    const unavailable = await planWithFallback(
      port(() => Promise.resolve(err({ code: 'RESEARCH_UNAVAILABLE', message: 'no key' }))),
      input,
    );
    expect(unavailable).toEqual({
      plan: standardChartPlan('fr'),
      warning: 'RESEARCH_UNAVAILABLE',
    });
  });

  it('never throws: a throwing port and an invalid plan both degrade with a warning', async () => {
    const thrown = await planWithFallback(
      port(() => Promise.reject(new Error('boom'))),
      input,
    );
    expect(thrown).toEqual({ plan: standardChartPlan('fr'), warning: 'RESEARCH_FAILED' });
    const invalid = await planWithFallback(
      port(() => Promise.resolve(ok({ sections: [] }))),
      input,
    );
    expect(invalid).toEqual({ plan: standardChartPlan('fr'), warning: 'RESEARCH_PLAN_INVALID' });
  });
});
