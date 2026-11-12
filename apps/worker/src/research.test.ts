import {
  loadFontCatalogue,
  runResearch,
  type ResearchRecording,
  type RunResearchDeps,
} from '@app/ai';
import type { ChartPlan } from '@app/contracts';
import { standardChartPlan } from '@app/document';
import { err, ok } from '@app/kernel';
import { describe, expect, it } from 'vitest';
import {
  indexText,
  okTransport,
  otherSectorIndexText,
  quotaTransport,
} from './research-fixtures.js';
import {
  aiResearch,
  defaultResearch,
  loadRecordedResearch,
  planWithFallback,
  replayResearch,
  type ResearchInput,
  type ResearchPort,
  type ResearchResult,
  type ResearchWarning,
} from './research.js';

const logo = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' as const };
const input: ResearchInput = { language: 'fr', brandName: 'Atelier', palette: ['#7A1F2B'], logo };
const recorded: ChartPlan = {
  sections: [
    { type: 'cover', title: 'Couverture', evidence: [] },
    { type: 'logo', title: 'Le logo', evidence: ['ref-1'] },
  ],
};
const result = (plan: ChartPlan, warnings: ResearchWarning[] = []): ResearchResult => ({
  plan,
  warnings,
});
const codes = (warnings: readonly ResearchWarning[] | undefined): string[] =>
  (warnings ?? []).map((warning) => warning.code);

describe('research port', () => {
  it('defaultResearch returns the standard plan in the project language', async () => {
    const fr = await defaultResearch.plan(input);
    expect(fr).toEqual({ ok: true, value: result(standardChartPlan('fr')) });
    const en = await defaultResearch.plan({ ...input, language: 'en' });
    expect(en.ok && en.value.plan.sections).toHaveLength(15);
    expect(en.ok && en.value.plan.sections[0]?.title).toBe('Cover');
  });

  it('replays a recorded plan without calling anything', async () => {
    const port = replayResearch(recorded);
    expect(port.ok).toBe(true);
    if (!port.ok) return;
    expect(await port.value.plan(input)).toEqual({ ok: true, value: result(recorded) });
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
});

describe('planWithFallback (degraded mode)', () => {
  const port = (plan: ResearchPort['plan']): ResearchPort => ({ plan });

  it('keeps the researched plan and its warnings', async () => {
    const outcome = await planWithFallback(
      port(() => Promise.resolve(ok(result(recorded, [{ code: 'RESEARCH_REPLAYED' }])))),
      input,
    );
    expect(outcome).toEqual({ plan: recorded, warnings: [{ code: 'RESEARCH_REPLAYED' }] });
  });

  it('falls back to the standard plan with the typed warning of the failure', async () => {
    const unavailable = await planWithFallback(
      port(() => Promise.resolve(err({ code: 'RESEARCH_UNAVAILABLE', message: 'no key' }))),
      input,
    );
    expect(unavailable).toEqual({
      plan: standardChartPlan('fr'),
      warnings: [{ code: 'RESEARCH_UNAVAILABLE', detail: 'no key' }],
    });
  });

  it('never throws: a throwing port and an invalid plan both degrade with a warning', async () => {
    const thrown = await planWithFallback(
      port(() => Promise.reject(new Error('boom'))),
      input,
    );
    expect(thrown).toEqual({
      plan: standardChartPlan('fr'),
      warnings: [{ code: 'RESEARCH_FAILED', cause: 'Error' }],
    });
    const invalid = await planWithFallback(
      port(() => Promise.resolve(ok(result({ sections: [] })))),
      input,
    );
    expect(invalid).toEqual({
      plan: standardChartPlan('fr'),
      warnings: [{ code: 'RESEARCH_PLAN_INVALID' }],
    });
  });
});

describe('aiResearch with a simulated Gemini (no network, no spend)', () => {
  const deps = (over: Partial<RunResearchDeps>): RunResearchDeps => ({
    transport: okTransport().transport,
    visionModel: 'gemini-test',
    catalogue: loadFontCatalogue(),
    readIndex: () => Promise.resolve(indexText),
    now: () => '2026-11-07T10:00:00.000Z',
    ...over,
  });
  const port = (over: Partial<RunResearchDeps>, record?: (r: ResearchRecording) => Promise<void>) =>
    aiResearch({
      run: (runInput) => runResearch(deps(over), runInput),
      ...(record === undefined ? {} : { record }),
    });

  it('live: returns the sourced plan and hands the recording over', async () => {
    const saved: ResearchRecording[] = [];
    const outcome = await port({}, (recording) => {
      saved.push(recording);
      return Promise.resolve();
    }).plan(input);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.plan.sections.some((section) => section.evidence.length > 0)).toBe(true);
    expect(outcome.value.plan.sections).not.toEqual(standardChartPlan('fr').sections);
    expect(saved).toHaveLength(1);
  });

  it('asks for the charter research explicitly', async () => {
    const purposes: (string | undefined)[] = [];
    const spy = aiResearch({
      run: (runInput) => {
        purposes.push(runInput.purpose);
        return runResearch(deps({}), runInput);
      },
    });
    await spy.plan(input);
    expect(purposes).toEqual(['charter']);
  });

  it('asks for page titles in the language of the project', async () => {
    const outcome = await port({}).plan({ ...input, language: 'fr' });
    expect(outcome.ok && outcome.value.plan.sections.map((section) => section.title)).toContain(
      'Couleurs : valeurs et rôles',
    );
    const english = await port({}).plan({ ...input, language: 'en' });
    expect(english.ok && english.value.plan.sections.map((section) => section.title)).toContain(
      'Colours: values and roles',
    );
  });

  it('a failing recording is a warning, never a failure', async () => {
    const outcome = await port({}, () => Promise.reject(new Error('disk full'))).plan(input);
    expect(outcome.ok && outcome.value.warnings).toContainEqual({
      code: 'RESEARCH_RECORDING_FAILED',
      cause: 'Error',
    });
  });

  it('live failing (quota): falls back to the recording of the same logo, with warnings', async () => {
    const live = await runResearch(deps({}), { logo, palette: ['#7A1F2B'] });
    const recording = live.ok ? live.value.recording : undefined;
    if (recording === undefined) throw new Error('no recording');
    const quota = quotaTransport();
    const saved: ResearchRecording[] = [];
    const outcome = await port({ transport: quota.transport, recordings: [recording] }, (r) => {
      saved.push(r);
      return Promise.resolve();
    }).plan(input);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(codes(outcome.value.warnings)).toEqual(
      expect.arrayContaining(['RESEARCH_FAILED', 'RESEARCH_REPLAYED_AFTER_FAILURE']),
    );
    // The cause (the quota) is kept for the logs, not lost behind the code.
    expect(outcome.value.warnings).toContainEqual({ code: 'RESEARCH_FAILED', detail: 'AI_QUOTA' });
    expect(outcome.value.plan.sections.some((section) => section.evidence.length > 0)).toBe(true);
    expect(saved).toEqual([]);
  });

  it('live failing without recording: default plan of the AI and the typed issue', async () => {
    const outcome = await port({ transport: quotaTransport().transport }).plan(input);
    expect(codes(outcome.ok ? outcome.value.warnings : undefined)).toContain('RESEARCH_FAILED');
    expect(outcome.ok && outcome.value.plan.sections.length).toBeGreaterThan(0);
  });

  it('absent corpus index: degraded plan with the missing-index warning', async () => {
    const outcome = await port({ readIndex: () => Promise.resolve(undefined) }).plan(input);
    expect(codes(outcome.ok ? outcome.value.warnings : undefined)).toEqual(
      expect.arrayContaining(['RESEARCH_REFERENCE_INDEX_MISSING']),
    );
  });

  it('a sector missing from the library rides as RESEARCH_SECTOR_NOT_INDEXED, and the plan is kept', async () => {
    const outcome = await port({ readIndex: () => Promise.resolve(otherSectorIndexText) }).plan(
      input,
    );
    expect(outcome.ok).toBe(true);
    const planned = await planWithFallback(
      port({ readIndex: () => Promise.resolve(otherSectorIndexText) }),
      input,
    );
    expect(codes(planned.warnings)).toContain('RESEARCH_SECTOR_NOT_INDEXED');
    expect(planned.plan.sections.length).toBeGreaterThan(0);
  });

  it('a covered sector raises no such warning', async () => {
    const planned = await planWithFallback(port({}), input);
    expect(codes(planned.warnings)).not.toContain('RESEARCH_SECTOR_NOT_INDEXED');
  });

  it('without a rendered logo the research is unavailable', async () => {
    const { language, brandName, palette } = input;
    expect(await port({}).plan({ language, brandName, palette })).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_UNAVAILABLE' },
    });
  });

  it('a throwing run and an invalid plan are failures, not exceptions', async () => {
    const thrown = aiResearch({ run: () => Promise.reject(new TypeError('network')) });
    expect(await thrown.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_FAILED', message: 'research threw (TypeError)' },
    });
    const failed = aiResearch({ run: () => Promise.resolve(err({ code: 'AI_REQUEST_REJECTED' })) });
    expect(await failed.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_FAILED' },
    });
    const invalid = aiResearch({
      run: async (runInput) => {
        const live = await runResearch(deps({}), runInput);
        return live.ok ? ok({ ...live.value, plan: { sections: [] } }) : live;
      },
    });
    expect(await invalid.plan(input)).toMatchObject({
      ok: false,
      error: { code: 'RESEARCH_PLAN_INVALID' },
    });
  });
});
