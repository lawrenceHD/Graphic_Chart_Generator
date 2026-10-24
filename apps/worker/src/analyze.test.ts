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
import { BrandDocumentSchema } from '@app/document';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { uuidV7 } from '@app/kernel';
import { sanitizeSvg } from '@app/svg-engine';
import { createNodeRasterizer, normalizeRaster } from '@app/svg-engine/raster';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeProject, failTimedOutAnalysis } from './analyze.js';
import { memoryStorage } from './memory-storage.js';

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
  const run = (analysisId: string) =>
    analyzeProject(
      { orm: test.database.orm, storage: memoryStorage(objects), rasterizer, normalizeRaster },
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
    expect(document.tokens.colors.primary).toEqual({ hex: '#1F4BFF', source: 'extracted' });
    expect(document.brand.name).toBe('Logo');
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

  it('analyses a raster logo; its variants wait for vectorisation', async () => {
    const image = await rasterizer.rasterize(new TextDecoder().decode(LOGO), 200);
    if (!image.ok) throw new Error(image.error.reason);
    const cursor = await lastEventId();
    const analysisId = await start(image.value.png, 'image/png');
    await run(analysisId);

    expect(await runRow(analysisId)).toMatchObject({ status: 'done', step: 4 });
    expect(await variants((await runRow(analysisId))?.logoAssetId ?? '')).toEqual([]);
    expect((await eventsAfter(cursor)).map((stored) => stored.event.data)).toContainEqual({
      step: 2,
      state: 'done',
      code: 'VARIANTS_NEED_VECTOR',
    });
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
