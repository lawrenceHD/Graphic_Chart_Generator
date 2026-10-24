import { createHash, randomBytes } from 'node:crypto';
import { assignRoles, brandClusters, extractPalette, type PaletteRoles } from '@app/color-engine';
import type {
  ObjectStorage,
  ProjectEvent,
  RasterError,
  RasterImage,
  Rasterizer,
} from '@app/contracts';
import {
  analysisRuns,
  and,
  appendProjectEvent,
  assets,
  documents,
  eq,
  inArray,
  isNull,
  projects,
  sql,
  type createDatabase,
} from '@app/db';
import { composeInitialDocument, CURRENT_SCHEMA_VERSION } from '@app/document';
import { err, ok, uuidV7, type Result } from '@app/kernel';
import { monochromeVariant, STRUCTURE_THRESHOLD, type MonoTarget } from '@app/logo-kit';
import { z } from 'zod';

// Job project.analyze (02_ARCHITECTURE.md §5.2, decision T-019 part 2): 1 palette (color-engine) stored in
// the meta of the logo_sanitized asset, 2 black and white variants (logo-kit) stored as logo_variant assets,
// 3 brand analysis — no AI yet (T-030): the explicit defaults of 07_AI_COPILOT.md §3.3 —, 4 initial document
// (document). Each step commits its result, the run's step and its events together, so a retried attempt
// resumes after the last step done and announces nothing twice.
type Orm = ReturnType<typeof createDatabase>['orm'];
type Tx = Parameters<Parameters<Orm['transaction']>[0]>[0];
type Run = typeof analysisRuns.$inferSelect;
type Asset = typeof assets.$inferSelect;

export interface AnalyzeDeps {
  readonly orm: Orm;
  readonly storage: ObjectStorage;
  readonly rasterizer: Rasterizer;
  readonly normalizeRaster: (bytes: Uint8Array) => Promise<Result<RasterImage, RasterError>>;
}

const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 01_PRODUCT_MVP.md §3
// Width of the render the palette is read from: enough pixels for thin strokes, few enough to stay fast.
const PALETTE_WIDTH = 400;
const SVG = 'image/svg+xml';
const VARIANTS: readonly (readonly [string, MonoTarget])[] = [
  ['black', '#000000'],
  ['white', '#FFFFFF'],
];

interface Palette {
  readonly clusters: readonly { hex: string; share: number }[];
  readonly background: string | null;
  readonly roles: PaletteRoles;
}
interface Variant {
  readonly name: string;
  readonly svg: Uint8Array;
  readonly meta: Record<string, unknown>;
}
/** What a step commits: its writes, a code reported with `done`, and events that follow `done`. */
interface StepDone {
  readonly save: (tx: Tx) => Promise<Saved | undefined>;
  readonly code?: string;
}
interface Saved {
  readonly code?: string;
  readonly after?: readonly ProjectEvent[];
}
type Step = (
  deps: AnalyzeDeps,
  logo: Asset,
  bytes: Uint8Array,
) => Promise<Result<StepDone, string>>;

const stepEvent = (step: number, state: 'running' | 'done' | 'failed', code?: string) =>
  ({
    type: 'analysis.step',
    data: code === undefined ? { step, state } : { step, state, code },
  }) satisfies ProjectEvent;
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

async function palette(
  deps: AnalyzeDeps,
  logo: Asset,
  bytes: Uint8Array,
): Promise<Result<StepDone, string>> {
  const image =
    logo.mime === SVG
      ? await deps.rasterizer.rasterize(new TextDecoder().decode(bytes), PALETTE_WIDTH)
      : await deps.normalizeRaster(bytes);
  if (!image.ok) return err(image.error.code);
  const { width, height, rgba } = image.value;
  const extracted = extractPalette({ width, height, data: new Uint8ClampedArray(rgba) });
  if (!extracted.ok) return err(extracted.error);
  const clusters = brandClusters(extracted.value);
  const value: Palette = {
    clusters: clusters.map(({ hex, share }) => ({ hex, share })),
    background: extracted.value.background?.hex ?? null,
    roles: assignRoles(clusters),
  };
  return ok({
    save: async (tx) => {
      await tx
        .update(assets)
        .set({ meta: sql`${assets.meta} || ${JSON.stringify({ palette: value })}::jsonb` })
        .where(eq(assets.id, logo.id));
      return undefined;
    },
  });
}

async function variants(
  deps: AnalyzeDeps,
  logo: Asset,
  bytes: Uint8Array,
): Promise<Result<StepDone, string>> {
  // Raster logos get their variants once vectorised (T-011).
  if (logo.mime !== SVG)
    return ok({ save: () => Promise.resolve(undefined), code: 'VARIANTS_NEED_VECTOR' });
  const svg = new TextDecoder().decode(bytes);
  const made: Variant[] = [];
  for (const [name, target] of VARIANTS) {
    const variant = await monochromeVariant(svg, target, deps.rasterizer);
    if (!variant.ok) return err(variant.error.code);
    // Masks and filters need the raster drawing (§5.2), which comes with vectorisation as well.
    if (variant.value.path !== 'structural')
      return ok({ save: () => Promise.resolve(undefined), code: 'VARIANTS_NEED_VECTOR' });
    const { drawing, structure, warnings } = variant.value;
    made.push({
      name,
      svg: new TextEncoder().encode(variant.value.svg),
      meta: { logoAssetId: logo.id, variant: name, drawing, structure, warnings },
    });
  }
  // Deterministic keys: a retry overwrites the same objects and rows instead of leaving orphans.
  const base = logo.storageKey.replace(/\/sanitized$/, '');
  for (const variant of made) await deps.storage.put(`${base}/${variant.name}`, variant.svg, SVG);
  return ok({
    save: async (tx) => {
      for (const variant of made) {
        const row: Omit<typeof assets.$inferInsert, 'id' | 'projectId' | 'kind' | 'storageKey'> = {
          status: 'clean',
          sha256: sha256(variant.svg),
          mime: SVG,
          bytes: variant.svg.length,
          meta: variant.meta,
          deletedAt: null,
        };
        await tx
          .insert(assets)
          .values({
            id: uuidV7(Date.now(), randomBytes(10)),
            projectId: logo.projectId,
            kind: 'logo_variant',
            storageKey: `${base}/${variant.name}`,
            ...row,
          })
          .onConflictDoUpdate({ target: assets.storageKey, set: row });
      }
      return undefined;
    },
  });
}

// Step 3 until the AI exists: nothing is guessed. The scene category takes its fallback (07_AI_COPILOT.md
// §3.3 point 4); texts stay empty in the document for the user to write.
function brandAnalysis(_deps: AnalyzeDeps, logo: Asset): Promise<Result<StepDone, string>> {
  return Promise.resolve(
    ok({
      code: 'AI_NOT_CONFIGURED',
      save: async (tx: Tx) => {
        await tx
          .update(projects)
          .set({ sceneCategory: sql`coalesce(${projects.sceneCategory}, 'generic')` })
          .where(eq(projects.id, logo.projectId));
        return undefined;
      },
    }),
  );
}

const Color = z.object({ hex: z.string(), source: z.enum(['extracted', 'derived']) });
const StoredPalette = z.object({
  palette: z.object({
    roles: z.object({
      primary: Color,
      accent: Color,
      neutralLight: Color,
      neutralDark: Color,
      extra: z.array(Color),
    }),
  }),
});
const StoredVariant = z.object({
  variant: z.enum(['black', 'white']),
  structure: z.number().nullable(),
  warnings: z.array(z.string()),
});

type VariantRefs = {
  assetId: string;
  kind: 'mono-black' | 'mono-white';
  needsReview: boolean;
  fidelity?: number;
}[];

// A variant row step 2 wrote that no longer reads back is reported, never left out of the document.
async function variantRefs(deps: AnalyzeDeps, logo: Asset): Promise<Result<VariantRefs, string>> {
  const rows = await deps.orm
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.projectId, logo.projectId),
        eq(assets.kind, 'logo_variant'),
        isNull(assets.deletedAt),
        sql`${assets.meta}->>'logoAssetId' = ${logo.id}`,
      ),
    );
  const refs: VariantRefs = [];
  for (const row of rows) {
    const meta = StoredVariant.safeParse(row.meta);
    if (!meta.success) return err('VARIANT_META_INVALID');
    const { variant, structure, warnings } = meta.data;
    refs.push({
      assetId: row.id,
      kind: variant === 'black' ? 'mono-black' : 'mono-white',
      needsReview: warnings.length > 0 || (structure ?? 0) < STRUCTURE_THRESHOLD,
      ...(structure === null ? {} : { fidelity: Math.min(1, Math.max(0, structure)) }),
    });
  }
  return ok(refs.sort((a, b) => a.kind.localeCompare(b.kind)));
}

const Language = z.enum(['fr', 'en']);

// Step 4: the document of the project, composed once. A project that already has one (a new analysis of
// another logo) keeps it: it may hold the user's edits.
async function composeDocument(deps: AnalyzeDeps, logo: Asset): Promise<Result<StepDone, string>> {
  const [existing] = await deps.orm
    .select({ seq: documents.seq })
    .from(documents)
    .where(eq(documents.projectId, logo.projectId));
  if (existing) return ok(keptDocument(logo));
  // Read before the transaction: the document is a snapshot of the project at analysis time.
  const [fresh] = await deps.orm.select().from(assets).where(eq(assets.id, logo.id));
  const palette = StoredPalette.safeParse(fresh?.meta);
  if (!palette.success) return err('PALETTE_MISSING');
  const [project] = await deps.orm.select().from(projects).where(eq(projects.id, logo.projectId));
  if (!project) return err('PROJECT_MISSING');
  const language = Language.safeParse(project.language);
  if (!language.success) return err('LANGUAGE_UNSUPPORTED');
  const refs = await variantRefs(deps, logo);
  if (!refs.ok) return refs;
  const document = composeInitialDocument({
    brandName: project.title,
    language: language.data,
    logoSanitizedId: logo.id,
    colors: palette.data.palette.roles,
    variants: [{ assetId: logo.id, kind: 'color', needsReview: false }, ...refs.value],
  });
  if (!document.ok) return err(document.error.code);
  return ok({
    save: async (tx: Tx) => {
      const created = await tx
        .insert(documents)
        .values({
          projectId: logo.projectId,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          body: document.value,
          seq: 0,
        })
        .onConflictDoNothing()
        .returning({ seq: documents.seq });
      // Another analysis of the project may have composed it in the meantime: theirs is kept.
      return finish(tx, logo.projectId, created.length > 0);
    },
  });
}

function keptDocument(logo: Asset): StepDone {
  return { save: (tx: Tx) => finish(tx, logo.projectId, false) };
}

/** The project is ready; `analysis.done` carries the head of its document. */
async function finish(tx: Tx, projectId: string, created: boolean): Promise<Saved> {
  const [current] = await tx
    .select({ seq: documents.seq })
    .from(documents)
    .where(eq(documents.projectId, projectId));
  // Inserted or kept in this very transaction: its absence is a bug, rolled back rather than announced.
  if (!current) throw new Error('documents row missing after step 4');
  await tx
    .update(projects)
    .set({ status: 'ready' })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)));
  const done = { type: 'analysis.done', data: { seq: current.seq } } satisfies ProjectEvent;
  return created ? { after: [done] } : { code: 'DOCUMENT_KEPT', after: [done] };
}

async function failRun(orm: Orm, run: Run, step: number, code: string): Promise<void> {
  await orm.transaction(async (tx) => {
    const [failed] = await tx
      .update(analysisRuns)
      .set({ status: 'failed', errorCode: code })
      .where(and(eq(analysisRuns.id, run.id), inArray(analysisRuns.status, ['pending', 'running'])))
      .returning({ id: analysisRuns.id });
    if (failed) await appendProjectEvent(tx, run.projectId, stepEvent(step, 'failed', code));
  });
}

async function readLogo(deps: AnalyzeDeps, run: Run): Promise<Result<[Asset, Uint8Array], string>> {
  const [logo] = await deps.orm
    .select()
    .from(assets)
    .where(
      and(eq(assets.id, run.logoAssetId), eq(assets.status, 'clean'), isNull(assets.deletedAt)),
    );
  if (!logo) return err('LOGO_NOT_READY');
  const read = await deps.storage.get(logo.storageKey, MAX_LOGO_BYTES);
  return read.ok ? ok([logo, read.value]) : err('LOGO_UNREADABLE');
}

export async function analyzeProject(deps: AnalyzeDeps, analysisId: string): Promise<void> {
  const { orm } = deps;
  const [run] = await orm.select().from(analysisRuns).where(eq(analysisRuns.id, analysisId));
  if (run?.status !== 'pending' && run?.status !== 'running') return;
  const logo = await readLogo(deps, run);
  if (!logo.ok) return failRun(orm, run, run.step + 1, logo.error);
  const [asset, bytes] = logo.value;
  await orm
    .update(analysisRuns)
    .set({ status: 'running' })
    .where(and(eq(analysisRuns.id, run.id), eq(analysisRuns.status, 'pending')));

  const steps: readonly Step[] = [palette, variants, brandAnalysis, composeDocument];
  for (let step = run.step + 1; step <= steps.length; step += 1) {
    const work = steps[step - 1];
    if (work === undefined) break;
    await orm.transaction((tx) =>
      appendProjectEvent(tx, run.projectId, stepEvent(step, 'running')),
    );
    const outcome = await work(deps, asset, bytes);
    if (!outcome.ok) return failRun(orm, run, step, outcome.error);
    await orm.transaction(async (tx) => {
      const saved = await outcome.value.save(tx);
      const status: Run['status'] = step === steps.length ? 'done' : 'running';
      await tx.update(analysisRuns).set({ step, status }).where(eq(analysisRuns.id, run.id));
      const code = saved?.code ?? outcome.value.code;
      await appendProjectEvent(tx, run.projectId, stepEvent(step, 'done', code));
      for (const event of saved?.after ?? []) await appendProjectEvent(tx, run.projectId, event);
    });
  }
}

/** Dead letter of project.analyze: every attempt failed on infrastructure, the user gets a verdict. */
export async function failTimedOutAnalysis(orm: Orm, analysisId: string): Promise<void> {
  const [run] = await orm.select().from(analysisRuns).where(eq(analysisRuns.id, analysisId));
  if (run) await failRun(orm, run, run.step + 1, 'ANALYSIS_TIMEOUT');
}
