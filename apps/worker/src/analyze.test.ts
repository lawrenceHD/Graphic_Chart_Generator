import { randomBytes } from 'node:crypto';
import {
  analysisRuns,
  and,
  assets,
  documents,
  eq,
  guestSessions,
  projects,
  readProjectEvents,
} from '@app/db';
import {
  loadFontCatalogue,
  runResearch,
  type ResearchRecording,
  type RunResearchDeps,
} from '@app/ai';
import {
  BrandDocumentSchema,
  CURRENT_SCHEMA_VERSION,
  STANDARD_PAGE_COUNT,
  standardChartPlan,
} from '@app/document';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { err, ok, uuidV7 } from '@app/kernel';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeProject, failTimedOutAnalysis, type AnalyzeDeps } from './analyze.js';
import { memoryStorage } from './memory-storage.js';
import { aiResearch, replayResearch } from './research.js';
import type { ResearchLogEntry } from './research-step.js';
import { indexText, okTransport, quotaTransport } from './research-fixtures.js';
import { createVtracer } from './vectorizer.js';

const adminUrl = integrationDatabaseUrl();
const id = (): string => uuidV7(Date.now(), randomBytes(10));
function sanitized(body: string): Uint8Array {
  const result = sanitizeSvg(
    new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`,
    ),
  );
  if (!result.ok) throw new Error(result.error.code);
  return new TextEncoder().encode(result.value.svg);
}
const LOGO = sanitized(
  '<path d="M10 10 L90 10 L50 90 Z" fill="#1F4BFF"/><circle cx="50" cy="35" r="12" fill="#FF7A00"/>',
);

describe.runIf(adminUrl !== '')('project.analyze, steps 1–4 (02_ARCHITECTURE.md §5.2)', () => {
  let test: TestDatabase;
  let projectId = '';
  let guestId = '';
  const objects = new Map<string, Uint8Array>();
  const rasterizer = createNodeRasterizer();
  const run = (
    analysisId: string,
    ai?: AnalyzeDeps['ai'],
    research?: AnalyzeDeps['research'],
    extra: Partial<AnalyzeDeps> = {},
  ) =>
    analyzeProject(
      {
        orm: test.database.orm,
        storage: memoryStorage(objects),
        rasterizer,
        normalizeRaster,
        vectorizer: createVtracer(),
        ...(ai === undefined ? {} : { ai }),
        ...(research === undefined ? {} : { research }),
        ...extra,
      },
      analysisId,
    );

  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    guestId = id();
    await test.database.orm
      .insert(guestSessions)
      .values({ id: guestId, tokenHash: guestId, expiresAt: new Date() });
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Logo' });
  });
  afterAll(async () => {
    await test.dispose();
  });

  async function start(bytes: Uint8Array, mime: string, step = 0): Promise<string> {
    const logoId = id();
    const storageKey = `projects/${projectId}/assets/${id()}/sanitized`;
    objects.set(storageKey, bytes);
    const { orm } = test.database;
    await orm.insert(assets).values({
      id: logoId,
      projectId,
      kind: 'logo_sanitized',
      status: 'clean',
      storageKey,
      mime,
      bytes: bytes.length,
    });
    const analysisId = id();
    await orm.insert(analysisRuns).values({
      id: analysisId,
      projectId,
      logoAssetId: logoId,
      idempotencyKey: analysisId,
      step,
      status: step === 0 ? 'pending' : 'running',
    });
    return analysisId;
  }
  const runRow = async (analysisId: string) =>
    (await test.database.orm.select().from(analysisRuns).where(eq(analysisRuns.id, analysisId)))[0];
  const variants = (logoAssetId: string) =>
    test.database.orm
      .select()
      .from(assets)
      .where(and(eq(assets.kind, 'logo_variant'), eq(assets.projectId, projectId)))
      .then((rows) =>
        rows.filter((row) => Reflect.get(Object(row.meta), 'logoAssetId') === logoAssetId),
      );
  const eventsAfter = async (cursor: number) =>
    (await readProjectEvents(test.database.orm, projectId, cursor, 100)).events;
  const lastEventId = async () =>
    (await readProjectEvents(test.database.orm, projectId, 0, 1000)).cursor;
  const documentRow = async () =>
    (await test.database.orm.select().from(documents).where(eq(documents.projectId, projectId)))[0];
  // Steps 3 (no AI yet: explicit defaults) and 4 (initial document) of a run on this project.
  const lastSteps = (code: string) => [
    { type: 'analysis.step', data: { step: 3, state: 'running' } },
    { type: 'analysis.step', data: { step: 3, state: 'done', code: 'AI_NOT_CONFIGURED' } },
    { type: 'analysis.step', data: { step: 4, state: 'running' } },
    {
      type: 'analysis.step',
      data: code === '' ? { step: 4, state: 'done' } : { step: 4, state: 'done', code },
    },
    { type: 'analysis.done', data: { seq: 0 } },
  ];

  const run0 = async (
    research: NonNullable<AnalyzeDeps['research']>,
    extra: Partial<AnalyzeDeps> = {},
  ): Promise<string> => {
    const analysisId = await start(LOGO, 'image/svg+xml');
    await run(analysisId, undefined, research, extra);
    return analysisId;
  };

  it('stores the palette and the variants, composes the document and reports each step', async () => {
    const cursor = await lastEventId();
    const analysisId = await start(LOGO, 'image/svg+xml');
    await run(analysisId);

    const done = await runRow(analysisId);
    expect(done).toMatchObject({ status: 'done', step: 4, errorCode: null });
    const [logo] = await test.database.orm
      .select()
      .from(assets)
      .where(eq(assets.id, done?.logoAssetId ?? ''));
    expect(logo?.meta).toMatchObject({
      palette: { roles: { primary: { hex: '#1F4BFF' }, accent: { hex: '#FF7A00' } } },
    });
    const made = await variants(done?.logoAssetId ?? '');
    expect(made.map((row): unknown => Reflect.get(Object(row.meta), 'variant')).sort()).toEqual([
      'black',
      'white',
    ]);
    for (const row of made) {
      expect(row).toMatchObject({ status: 'clean', mime: 'image/svg+xml' });
      expect(new TextDecoder().decode(objects.get(row.storageKey))).toMatch(/^<svg /);
    }
    expect((await eventsAfter(cursor)).map((stored) => stored.event)).toEqual([
      { type: 'analysis.step', data: { step: 1, state: 'running' } },
      { type: 'analysis.step', data: { step: 1, state: 'done' } },
      { type: 'analysis.step', data: { step: 2, state: 'running' } },
      { type: 'analysis.step', data: { step: 2, state: 'done' } },
      ...lastSteps(''),
    ]);
    const stored = await documentRow();
    expect(stored?.seq).toBe(0);
    const document = BrandDocumentSchema.parse(stored?.body);
    // ADR-035: the share of the logo in the colour, measured at extraction.
    expect(document.tokens.colors.primary).toMatchObject({ hex: '#1F4BFF', source: 'extracted' });
    expect(document.tokens.colors.primary.share).toBeGreaterThan(0.5);
    expect(document.tokens.colors.primary.share).toBeLessThanOrEqual(1);
    expect(document.brand.name).toBe('Logo');
    // R6, R7: measured on the logo (one piece: x by convention; minimum on the floors), not the defaults.
    expect(document.tokens.logo).toMatchObject({
      clearSpaceRatio: 0.25,
      minSizePx: 24,
      minSizeMm: 5,
      origin: 'measured',
      clearSpaceSource: 'convention',
    });
    expect(document.tokens.logo.versions?.full.heightPx).toBe(24);
    const byVariant = new Map(
      made.map((row) => [Reflect.get(Object(row.meta), 'variant'), row.id] as const),
    );
    expect(document.assets).toMatchObject({
      logoSanitizedId: done?.logoAssetId,
      variants: [
        { assetId: done?.logoAssetId, kind: 'color', needsReview: false },
        { assetId: byVariant.get('black'), kind: 'mono-black' },
        { assetId: byVariant.get('white'), kind: 'mono-white' },
      ],
    });
    expect(
      await test.database.orm.select().from(projects).where(eq(projects.id, projectId)),
    ).toMatchObject([{ sceneCategory: 'generic', status: 'ready' }]);

    // A redelivered job finds the run done: nothing is redone or announced again.
    const after = await lastEventId();
    await run(analysisId);
    expect(await eventsAfter(after)).toEqual([]);
    expect(await variants(done?.logoAssetId ?? '')).toHaveLength(2);
  });

  it('resumes after the last step done (a retried attempt)', async () => {
    const cursor = await lastEventId();
    const analysisId = await start(LOGO, 'image/svg+xml', 1);
    await run(analysisId);
    // The project already has a document, which the user may have edited: it is kept as it is.
    const before = await documentRow();
    expect((await eventsAfter(cursor)).map((stored) => stored.event)).toEqual([
      { type: 'analysis.step', data: { step: 2, state: 'running' } },
      { type: 'analysis.step', data: { step: 2, state: 'done' } },
      ...lastSteps('DOCUMENT_KEPT'),
    ]);
    expect(await documentRow()).toEqual(before);
  });

  it('traces a raster logo, then draws its variants from the traced SVG', async () => {
    const image = await rasterizer.rasterize(new TextDecoder().decode(LOGO), 200);
    if (!image.ok) throw new Error(image.error.reason);
    const analysisId = await start(image.value.png, 'image/png');
    await run(analysisId);

    expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
    const rows = await variants((await runRow(analysisId))?.logoAssetId ?? '');
    expect(rows.map((row) => String(Reflect.get(Object(row.meta), 'variant'))).sort()).toEqual([
      'black',
      'vector',
      'white',
    ]);
    const vector = rows.find((row) => Reflect.get(Object(row.meta), 'variant') === 'vector');
    expect(Reflect.get(Object(vector?.meta), 'fidelity')).toBeGreaterThan(0.97);
    const svg = new TextDecoder().decode(objects.get(vector?.storageKey ?? '') ?? new Uint8Array());
    // Both inks of the logo, traced as paths.
    expect(svg).toContain('#1F4BFF');
    expect(svg).toContain('#FF7A00');
  });

  it('fails the run with a stable code when the logo has no visible colour', async () => {
    const cursor = await lastEventId();
    const analysisId = await start(sanitized('<rect width="0" height="0"/>'), 'image/svg+xml');
    await run(analysisId);

    expect(await runRow(analysisId)).toMatchObject({ status: 'failed', errorCode: 'EMPTY_IMAGE' });
    expect((await eventsAfter(cursor)).at(-1)?.event.data).toEqual({
      step: 1,
      state: 'failed',
      code: 'EMPTY_IMAGE',
    });
  });

  it('shows a raster logo on an opaque background through its traced, transparent drawing', async () => {
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Fond blanc' });
    const boxed = sanitized(
      '<rect width="100" height="100" fill="#FFFFFF"/><path d="M10 10 L90 10 L50 90 Z" fill="#1F4BFF"/><circle cx="50" cy="35" r="12" fill="#FF7A00"/>',
    );
    const image = await rasterizer.rasterize(new TextDecoder().decode(boxed), 200);
    if (!image.ok) throw new Error(image.error.reason);
    const analysisId = await start(image.value.png, 'image/png');
    await run(analysisId);

    const document = BrandDocumentSchema.parse((await documentRow())?.body);
    const color = document.assets.variants.find((variant) => variant.kind === 'color');
    const vector = document.assets.variants.find((variant) => variant.kind === 'vector');
    expect(vector).toBeDefined();
    // The white box of the upload is not part of the logo: the colour version is the cut-out drawing.
    expect(color?.assetId).toBe(vector?.assetId);
  });

  it('step 3 writes the brand analysis of Gemini into the document (07_AI_COPILOT.md §3)', async () => {
    projectId = id();
    await test.database.orm.insert(projects).values({
      id: projectId,
      guestSessionId: guestId,
      title: 'La Mèza',
      briefText: 'Des dîners entre inconnus, autour d’une même table.',
    });
    const analysis = {
      industryLabel: 'Dîners entre inconnus',
      sceneCategory: 'hospitality',
      archetype: 'caregiver',
      mission: 'Réunir des inconnus autour d’une même table.',
      vision: 'Une table de rencontre dans chaque ville.',
      values: ['Hospitalité', 'Élégance', 'Bienveillance', 'Partage'].map((label) => ({
        label,
        description: `${label} à chaque dîner.`,
      })),
      tone: {
        axes: ['formal-casual', 'serious-playful', 'classic-avantgarde', 'sober-expressive'].map(
          (axis) => ({ id: axis, value: 40 }),
        ),
        examples: ['Bienvenue à table.', 'Six chaises.', 'Une place pour vous.'],
      },
      typographyPairingId: 'warm-serif',
      rationale: 'Le brief parle d’hospitalité ; la palette est chaleureuse.',
    };
    const prompts: string[] = [];
    const transport: NonNullable<AnalyzeDeps['ai']>['transport'] = (_model, _method, body) => {
      prompts.push(JSON.stringify(body));
      return Promise.resolve({
        ok: true,
        value: { candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] },
      });
    };
    const analysisId = await start(LOGO, 'image/svg+xml');
    await run(analysisId, { transport, model: 'gemini-test' });

    expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
    expect(prompts[0]).toContain('Des dîners entre inconnus');
    const document = BrandDocumentSchema.parse((await documentRow())?.body);
    expect(document.brand).toMatchObject({ mission: analysis.mission, archetype: 'caregiver' });
    expect(document.tokens.typography.pairingId).toBe('warm-serif');
    const [project] = await test.database.orm
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    expect(project).toMatchObject({
      sceneCategory: 'hospitality',
      industryLabel: 'Dîners entre inconnus',
    });
  });

  it('step 4 composes the standard plan (14 dense pages and the tokens) by default, without warning', async () => {
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Standard' });
    await run(await start(LOGO, 'image/svg+xml'));
    const document = BrandDocumentSchema.parse((await documentRow())?.body);
    expect(document.pages).toHaveLength(STANDARD_PAGE_COUNT);
  });

  it('degrades to the standard plan and reports RESEARCH_FAILED when research fails', async () => {
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Degraded' });
    const cursor = await lastEventId();
    const research: NonNullable<AnalyzeDeps['research']> = {
      plan: () => Promise.reject(new Error('quota')),
    };
    const analysisId = await run0(research);
    expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
    expect((await eventsAfter(cursor)).map((stored) => stored.event)).toContainEqual({
      type: 'analysis.step',
      data: { step: 4, state: 'done', code: 'RESEARCH_FAILED' },
    });
    const document = BrandDocumentSchema.parse((await documentRow())?.body);
    expect(document.pages).toHaveLength(STANDARD_PAGE_COUNT);
  });

  describe('research warnings are never lost', () => {
    const fresh = async (title: string): Promise<number> => {
      projectId = id();
      await test.database.orm
        .insert(projects)
        .values({ id: projectId, guestSessionId: guestId, title });
      return lastEventId();
    };
    const stepCodes = async (cursor: number): Promise<(string | undefined)[]> =>
      (await eventsAfter(cursor)).flatMap(({ event }) =>
        event.type === 'analysis.step' && event.data.step === 4 && event.data.state === 'done'
          ? [event.data.code]
          : [],
      );

    it('emits them when another analysis composed the document first (DOCUMENT_KEPT)', async () => {
      const cursor = await fresh('Race');
      const research: NonNullable<AnalyzeDeps['research']> = {
        plan: async () => {
          await test.database.orm
            .insert(documents)
            .values({ projectId, schemaVersion: CURRENT_SCHEMA_VERSION, body: {}, seq: 0 });
          return ok({
            plan: standardChartPlan('fr'),
            warnings: [{ code: 'RESEARCH_FAILED' }, { code: 'RESEARCH_REPLAYED' }],
          });
        },
      };
      await run0(research);
      expect(await stepCodes(cursor)).toEqual(
        expect.arrayContaining(['DOCUMENT_KEPT', 'RESEARCH_FAILED', 'RESEARCH_REPLAYED']),
      );
    });

    it('logs each warning with its cause and the run, and the logo render failure', async () => {
      await fresh('Logs');
      const logged: ResearchLogEntry[] = [];
      const research: NonNullable<AnalyzeDeps['research']> = {
        plan: () => Promise.reject(new TypeError('boom')),
      };
      const failing: AnalyzeDeps['rasterizer'] = {
        bbox: (svg) => rasterizer.bbox(svg),
        rasterize: (svg, width) =>
          width === 1024
            ? Promise.resolve(err({ code: 'RASTER_FAILED', reason: 'test' }))
            : rasterizer.rasterize(svg, width),
      };
      const analysisId = await run0(research, {
        rasterizer: failing,
        onResearchWarning: (entry) => logged.push(entry),
      });
      expect(logged).toEqual([
        { analysisId, projectId, code: 'RESEARCH_LOGO_UNRENDERABLE', detail: 'RASTER_FAILED' },
        { analysisId, projectId, code: 'RESEARCH_FAILED', cause: 'TypeError' },
      ]);
    });
  });

  describe('AI research with a simulated Gemini (no network)', () => {
    const live = (
      over: Partial<RunResearchDeps>,
      record?: (recording: ResearchRecording) => Promise<void>,
    ) =>
      aiResearch({
        run: (input) =>
          runResearch(
            {
              transport: okTransport().transport,
              visionModel: 'gemini-test',
              catalogue: loadFontCatalogue(),
              readIndex: () => Promise.resolve(indexText),
              now: () => '2026-11-07T10:00:00.000Z',
              ...over,
            },
            input,
          ),
        ...(record === undefined ? {} : { record }),
      });
    const freshProject = async (title: string): Promise<number> => {
      projectId = id();
      await test.database.orm
        .insert(projects)
        .values({ id: projectId, guestSessionId: guestId, title });
      return lastEventId();
    };
    const doneCodes = async (cursor: number): Promise<(string | undefined)[]> =>
      (await eventsAfter(cursor)).flatMap(({ event }) =>
        event.type === 'analysis.step' && event.data.step === 4 && event.data.state === 'done'
          ? [event.data.code]
          : [],
      );
    const saved: ResearchRecording[] = [];

    it('live: the pages follow the sourced plan, the recording is kept', async () => {
      const cursor = await freshProject('Live');
      const analysisId = await run0(
        live({}, (recording) => {
          saved.push(recording);
          return Promise.resolve();
        }),
      );
      expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
      const document = BrandDocumentSchema.parse((await documentRow())?.body);
      expect(document.pages.some((page) => JSON.stringify(page.data).includes('menu-1'))).toBe(
        true,
      );
      expect(saved).toHaveLength(1);
      expect(await doneCodes(cursor)).toEqual([undefined]);
    });

    it('live failing: falls back to the recording, every issue reported, run still done', async () => {
      const [recording] = saved;
      if (recording === undefined) throw new Error('the live test must run first');
      const cursor = await freshProject('Fallback');
      const analysisId = await run0(
        live({ transport: quotaTransport().transport, recordings: [recording] }),
      );
      expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
      expect(await doneCodes(cursor)).toEqual(
        expect.arrayContaining(['RESEARCH_FAILED', 'RESEARCH_REPLAYED_AFTER_FAILURE']),
      );
      const document = BrandDocumentSchema.parse((await documentRow())?.body);
      expect(document.pages.some((page) => JSON.stringify(page.data).includes('menu-1'))).toBe(
        true,
      );
    });

    it('absent corpus index: degraded, typed warnings, run still done', async () => {
      const cursor = await freshProject('NoIndex');
      const analysisId = await run0(live({ readIndex: () => Promise.resolve(undefined) }));
      expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
      expect(await doneCodes(cursor)).toEqual(
        expect.arrayContaining([
          'RESEARCH_REFERENCE_INDEX_MISSING',
          'RESEARCH_VISUAL_SIMILARITY_UNAVAILABLE',
        ]),
      );
    });
  });

  it('replays a recorded plan: its sections become the pages', async () => {
    projectId = id();
    await test.database.orm
      .insert(projects)
      .values({ id: projectId, guestSessionId: guestId, title: 'Replay' });
    const replay = replayResearch({
      sections: [
        { type: 'cover', title: 'Couverture', evidence: [] },
        { type: 'logo', title: 'Le logo', evidence: ['ref-1'] },
      ],
    });
    if (!replay.ok) throw new Error(replay.error.code);
    const analysisId = await run0(replay.value);
    expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
    const document = BrandDocumentSchema.parse((await documentRow())?.body);
    expect(document.pages.map((page) => page.title)).toEqual(['Couverture', 'Le logo']);
  });

  it('fails step 4 with a stable code when a variant no longer reads back', async () => {
    projectId = id();
    const { orm } = test.database;
    await orm.insert(projects).values({ id: projectId, guestSessionId: guestId, title: 'Autre' });
    const analysisId = await start(LOGO, 'image/svg+xml', 2);
    const logoId = (await runRow(analysisId))?.logoAssetId ?? '';
    const roles = {
      primary: { hex: '#1F4BFF', source: 'extracted' },
      accent: { hex: '#FF7A00', source: 'extracted' },
      neutralLight: { hex: '#F4F4FC', source: 'derived' },
      neutralDark: { hex: '#15151F', source: 'derived' },
      extra: [],
    };
    await orm
      .update(assets)
      .set({ meta: { palette: { roles } } })
      .where(eq(assets.id, logoId));
    await orm.insert(assets).values({
      id: id(),
      projectId,
      kind: 'logo_variant',
      status: 'clean',
      storageKey: `projects/${projectId}/assets/${id()}/black`,
      mime: 'image/svg+xml',
      bytes: 1,
      meta: { logoAssetId: logoId, variant: 'black' },
    });
    const cursor = await lastEventId();
    await run(analysisId);

    expect(await runRow(analysisId)).toMatchObject({
      status: 'failed',
      errorCode: 'VARIANT_META_INVALID',
    });
    expect((await eventsAfter(cursor)).at(-1)?.event.data).toEqual({
      step: 4,
      state: 'failed',
      code: 'VARIANT_META_INVALID',
    });
    expect(await documentRow()).toBeUndefined();
  });

  it('dead letter: a run out of attempts fails on the step it was on', async () => {
    const analysisId = await start(LOGO, 'image/svg+xml', 1);
    const cursor = await lastEventId();
    await failTimedOutAnalysis(test.database.orm, analysisId);

    expect(await runRow(analysisId)).toMatchObject({
      status: 'failed',
      errorCode: 'ANALYSIS_TIMEOUT',
    });
    expect((await eventsAfter(cursor)).map((stored) => stored.event.data)).toEqual([
      { step: 2, state: 'failed', code: 'ANALYSIS_TIMEOUT' },
    ]);
  });
});
