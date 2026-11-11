import { createHash, randomBytes } from 'node:crypto';
import {
  AssetErrorCodeSchema,
  LogoAssetMetaSchema,
  MAX_BRIEF_DOC_BYTES,
  type ManifestFormat,
  type AssetErrorCode,
  type ObjectStorage,
  type RasterError,
  type RasterImage,
  type Rasterizer,
} from '@app/contracts';
import { and, appendProjectEvent, assets, eq, isNull, sql, type createDatabase } from '@app/db';
import { err, ok, uuidV7, type Result } from '@app/kernel';
import {
  detectType,
  ensureViewBox,
  sanitizeSvg,
  type DetectedType,
  type SanitizedSvg,
} from '@app/svg-engine';
import { extractManifest, manifestOfText, type Manifest } from './manifest.js';
import { withoutPageBox, type VectorConverter, type VectorSource } from './vector-converter.js';

// Job asset.scan (02_ARCHITECTURE.md §5.1): magic bytes (SEC-12), limits (SEC-13), allowlist sanitizing
// (SEC-14) or raster normalisation, isolated rendering (SEC-15). The sanitized copy is what the product uses;
// the original stays private for good. Re-running the job is harmless: only a quarantined asset is scanned.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface ScanDeps {
  readonly orm: Orm;
  readonly storage: ObjectStorage;
  readonly rasterizer: Rasterizer;
  readonly normalizeRaster: (bytes: Uint8Array) => Promise<Result<RasterImage, RasterError>>;
  /** .ai, EPS, PDF and SVG with live text (ADR-033). Absent: those are refused, as before. */
  readonly vectors?: VectorConverter;
}

const MAX_RASTER_BYTES = 10 * 1024 * 1024; // 01_PRODUCT_MVP.md §3
const MAX_SVG_BYTES = 5 * 1024 * 1024;
const MIME: Record<Exclude<DetectedType, 'unknown'>, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  postscript: 'application/postscript',
};
const encoder = new TextEncoder();

interface Derived {
  readonly bytes: Uint8Array;
  readonly mime: string;
  readonly width: number | null;
  readonly height: number | null;
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const assetCode = (code: string): AssetErrorCode => {
  const parsed = AssetErrorCodeSchema.safeParse(code);
  return parsed.success ? parsed.data : 'ASSET_DECODE_FAILED';
};

/** The SVG with its text elements taken out; a stray tspan or textPath stays, and is refused again. */
function withoutLiveText(svg: string): string {
  return svg.replace(/<text\b[^>]*\/>|<text\b[\s\S]*?<\/text\s*>/giu, '');
}

async function framed(
  deps: ScanDeps,
  sanitized: SanitizedSvg,
): Promise<Result<Derived, AssetErrorCode>> {
  const svg = await ensureViewBox(sanitized, deps.rasterizer);
  if (!svg.ok) return err(assetCode(svg.error.code));
  return ok({ bytes: encoder.encode(svg.value), mime: MIME.svg, width: null, height: null });
}

// The converter's SVG is untrusted like an upload: same size limit, same sanitizer. A PDF or EPS page is
// dropped so the logo is framed on its drawing; an SVG keeps the frame its designer gave it.
async function converted(
  deps: ScanDeps,
  vectors: VectorConverter,
  bytes: Uint8Array,
  source: VectorSource,
): Promise<Result<Derived, AssetErrorCode>> {
  const written = await vectors.toSvg(bytes, source);
  if (!written.ok) return err(written.error);
  const svg = encoder.encode(source === 'svg' ? written.value : withoutPageBox(written.value));
  if (svg.length > MAX_SVG_BYTES) return err('ASSET_TOO_LARGE');
  const sanitized = sanitizeSvg(svg);
  if (!sanitized.ok) return err(sanitized.error.code);
  return framed(deps, sanitized.value);
}

async function derive(
  deps: ScanDeps,
  bytes: Uint8Array,
  type: DetectedType,
): Promise<Result<Derived, AssetErrorCode>> {
  if (type === 'unknown') return err('ASSET_TYPE_UNSUPPORTED');
  if (type === 'pdf' || type === 'postscript') {
    return deps.vectors === undefined
      ? err('ASSET_TYPE_UNSUPPORTED')
      : converted(deps, deps.vectors, bytes, type);
  }
  if (type === 'svg') {
    if (bytes.length > MAX_SVG_BYTES) return err('ASSET_TOO_LARGE');
    const sanitized = sanitizeSvg(bytes);
    if (sanitized.ok) return framed(deps, sanitized.value);
    // Live text is the one refusal a conversion fixes. The sanitizer stops at the first fault, so the SVG
    // without its text must pass every other rule on its own before the converter sees a single byte.
    const liveText = sanitized.error.hint === 'convert-text-to-outlines';
    if (!liveText || deps.vectors === undefined) return err(sanitized.error.code);
    const rest = sanitizeSvg(encoder.encode(withoutLiveText(new TextDecoder().decode(bytes))));
    if (!rest.ok) return err(rest.error.code);
    return converted(deps, deps.vectors, bytes, 'svg');
  }
  const raster = await deps.normalizeRaster(bytes);
  if (!raster.ok) return err(assetCode(raster.error.code));
  const { png, width, height } = raster.value;
  return ok({ bytes: png, mime: MIME.png, width, height });
}

export async function scanAsset(deps: ScanDeps, assetId: string): Promise<void> {
  const { orm, storage } = deps;
  const [asset] = await orm
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)));
  if (asset?.status !== 'quarantined') return;
  const pending = and(eq(assets.id, assetId), eq(assets.status, 'quarantined'));
  const reject = (code: AssetErrorCode, mime: string | null = null): Promise<void> =>
    markRejected(orm, asset.projectId, assetId, code, { mime });

  if (asset.kind === 'brief_doc') return scanDocument(deps, asset, pending, reject);
  if (asset.kind !== 'logo_original') return reject('ASSET_TYPE_UNSUPPORTED');
  const read = await storage.get(asset.storageKey, MAX_RASTER_BYTES);
  if (!read.ok)
    return reject(read.error === 'TOO_LARGE' ? 'ASSET_TOO_LARGE' : 'ASSET_DECODE_FAILED');
  const type = detectType(read.value);
  const mime = type === 'unknown' ? null : MIME[type];
  const derived = await derive(deps, read.value, type);
  if (!derived.ok) return reject(derived.error, mime);

  // Deterministic key: a retry after a crash overwrites the same object instead of leaving orphans.
  const storageKey = asset.storageKey.replace(/\/original$/, '/sanitized');
  await storage.put(storageKey, derived.value.bytes, derived.value.mime);
  const sanitizedId = uuidV7(Date.now(), randomBytes(10));
  await orm.transaction(async (tx) => {
    const [moved] = await tx
      .update(assets)
      .set({
        status: 'clean',
        mime,
        sha256: sha256(read.value),
        width: derived.value.width,
        height: derived.value.height,
        meta: sql`${assets.meta} || ${JSON.stringify({ sanitizedAssetId: sanitizedId })}::jsonb`,
      })
      .where(pending)
      .returning({ id: assets.id });
    if (!moved) return;
    await appendProjectEvent(tx, asset.projectId, {
      type: 'asset.status',
      data: { assetId, status: 'clean' },
    });
    // The role and primary flag chosen at upload follow the sanitized copy, the one the product uses.
    const declared = LogoAssetMetaSchema.safeParse(asset.meta);
    const carried = declared.success
      ? {
          ...(declared.data.role === undefined ? {} : { role: declared.data.role }),
          ...(declared.data.primary === undefined ? {} : { primary: declared.data.primary }),
          ...(declared.data.fileName === undefined ? {} : { fileName: declared.data.fileName }),
        }
      : {};
    await tx.insert(assets).values({
      id: sanitizedId,
      projectId: asset.projectId,
      kind: 'logo_sanitized',
      status: 'clean',
      storageKey,
      sha256: sha256(derived.value.bytes),
      mime: derived.value.mime,
      bytes: derived.value.bytes.length,
      width: derived.value.width,
      height: derived.value.height,
      meta: { sourceAssetId: asset.id, ...carried },
    });
  });
}

const DOCUMENT_MIME: Record<ManifestFormat, string> = {
  text: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

type Asset = typeof assets.$inferSelect;

// A PDF brief is read by the vector converter when there is one; refused with its own code otherwise.
async function readManifest(
  deps: ScanDeps,
  bytes: Uint8Array,
): Promise<Result<Manifest, AssetErrorCode>> {
  const manifest = extractManifest(bytes);
  if (manifest.ok || manifest.error !== 'ASSET_PDF_UNSUPPORTED' || deps.vectors === undefined)
    return manifest;
  const read = await deps.vectors.toText(bytes);
  return read.ok ? manifestOfText('pdf', read.value) : read;
}

// A manifest: text extracted, cleaned and capped (untrusted data, 07_AI_COPILOT.md); the cleaned text is kept
// in the asset's meta, the original stays private like a logo original.
async function scanDocument(
  deps: ScanDeps,
  asset: Asset,
  pending: ReturnType<typeof and>,
  reject: (code: AssetErrorCode, mime?: string | null) => Promise<void>,
): Promise<void> {
  const read = await deps.storage.get(asset.storageKey, MAX_BRIEF_DOC_BYTES);
  if (!read.ok)
    return reject(read.error === 'TOO_LARGE' ? 'ASSET_TOO_LARGE' : 'ASSET_DECODE_FAILED');
  const manifest = await readManifest(deps, read.value);
  if (!manifest.ok) return reject(manifest.error);
  const { format, text, filteredLines, truncated } = manifest.value;
  const declared = LogoAssetMetaSchema.safeParse(asset.meta);
  const fileName = declared.success ? declared.data.fileName : undefined;
  const meta = {
    ...(fileName === undefined ? {} : { fileName }),
    format,
    text,
    filteredLines,
    truncated,
  };
  await deps.orm.transaction(async (tx) => {
    const [moved] = await tx
      .update(assets)
      .set({
        status: 'clean',
        mime: DOCUMENT_MIME[format],
        sha256: sha256(read.value),
        meta,
      })
      .where(pending)
      .returning({ id: assets.id });
    if (!moved) return;
    await appendProjectEvent(tx, asset.projectId, {
      type: 'asset.status',
      data: { assetId: asset.id, status: 'clean' },
    });
  });
}

// The verdict and its SSE event (04_API_CONTRACTS.md §5) commit together; only a quarantined asset moves.
async function markRejected(
  orm: Orm,
  projectId: string,
  assetId: string,
  code: AssetErrorCode,
  extra: { readonly mime?: string | null },
): Promise<void> {
  await orm.transaction(async (tx) => {
    const [moved] = await tx
      .update(assets)
      .set({ status: 'rejected', rejectReason: code, ...extra })
      .where(and(eq(assets.id, assetId), eq(assets.status, 'quarantined')))
      .returning({ id: assets.id });
    if (!moved) return;
    await appendProjectEvent(tx, projectId, {
      type: 'asset.status',
      data: { assetId, status: 'rejected', rejectReason: code },
    });
  });
}

/** Dead letter of asset.scan: every attempt failed on infrastructure, so the user gets a verdict, not a spinner. */
export async function rejectTimedOut(orm: Orm, assetId: string): Promise<void> {
  const [asset] = await orm
    .select({ projectId: assets.projectId })
    .from(assets)
    .where(eq(assets.id, assetId));
  if (asset) await markRejected(orm, asset.projectId, assetId, 'ASSET_SCAN_TIMEOUT', {});
}
