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
  eq,
  inArray,
  isNull,
  sql,
  type createDatabase,
} from '@app/db';
import { err, ok, uuidV7, type Result } from '@app/kernel';
import { monochromeVariant, type MonoTarget } from '@app/logo-kit';

// Job project.analyze (02_ARCHITECTURE.md §5.2, decision T-019 part 2): deterministic steps without AI —
// 1 palette (color-engine) stored in the meta of the logo_sanitized asset, 2 black and white variants
// (logo-kit) stored as logo_variant assets. Each step commits its result, the run's step and its event
// together, so a retried attempt resumes after the last step done and announces nothing twice.
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
/** What a step commits: its writes, and an optional code reported with `done`. */
interface StepDone {
  readonly save: (tx: Tx) => Promise<void>;
  readonly code?: string;
}

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
    },
  });
}

async function variants(
  deps: AnalyzeDeps,
  logo: Asset,
  bytes: Uint8Array,
): Promise<Result<StepDone, string>> {
  // Raster logos get their variants once vectorised (T-011).
  if (logo.mime !== SVG) return ok({ save: () => Promise.resolve(), code: 'VARIANTS_NEED_VECTOR' });
  const svg = new TextDecoder().decode(bytes);
  const made: Variant[] = [];
  for (const [name, target] of VARIANTS) {
    const variant = await monochromeVariant(svg, target, deps.rasterizer);
    if (!variant.ok) return err(variant.error.code);
    // Masks and filters need the raster drawing (§5.2), which comes with vectorisation as well.
    if (variant.value.path !== 'structural')
      return ok({ save: () => Promise.resolve(), code: 'VARIANTS_NEED_VECTOR' });
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
    },
  });
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

  const steps = [palette, variants];
  for (let step = run.step + 1; step <= steps.length; step += 1) {
    const work = steps[step - 1];
    if (work === undefined) break;
    await orm.transaction((tx) =>
      appendProjectEvent(tx, run.projectId, stepEvent(step, 'running')),
    );
    const outcome = await work(deps, asset, bytes);
    if (!outcome.ok) return failRun(orm, run, step, outcome.error);
    await orm.transaction(async (tx) => {
      await outcome.value.save(tx);
      // Steps 3 (AI) and 4 (document) come with T-019 part 2b: the run ends after the last step here.
      const status: Run['status'] = step === steps.length ? 'done' : 'running';
      await tx.update(analysisRuns).set({ step, status }).where(eq(analysisRuns.id, run.id));
      await appendProjectEvent(tx, run.projectId, stepEvent(step, 'done', outcome.value.code));
    });
  }
}

/** Dead letter of project.analyze: every attempt failed on infrastructure, the user gets a verdict. */
export async function failTimedOutAnalysis(orm: Orm, analysisId: string): Promise<void> {
  const [run] = await orm.select().from(analysisRuns).where(eq(analysisRuns.id, analysisId));
  if (run) await failRun(orm, run, run.step + 1, 'ANALYSIS_TIMEOUT');
}
