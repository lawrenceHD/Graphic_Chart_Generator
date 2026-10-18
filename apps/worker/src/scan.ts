import { createHash, randomBytes } from 'node:crypto';
import {
  AssetErrorCodeSchema,
  type AssetErrorCode,
  type ObjectStorage,
  type RasterError,
  type RasterImage,
  type Rasterizer,
} from '@app/contracts';
import { and, assets, eq, isNull, type createDatabase } from '@app/db';
import { err, ok, uuidV7, type Result } from '@app/kernel';
import { detectType, ensureViewBox, sanitizeSvg, type DetectedType } from '@app/svg-engine';

// Job asset.scan (02_ARCHITECTURE.md §5.1): magic bytes (SEC-12), limits (SEC-13), allowlist sanitizing
// (SEC-14) or raster normalisation, isolated rendering (SEC-15). The sanitized copy is what the product uses;
// the original stays private for good. Re-running the job is harmless: only a quarantined asset is scanned.
type Orm = ReturnType<typeof createDatabase>['orm'];

export interface ScanDeps {
  readonly orm: Orm;
  readonly storage: ObjectStorage;
  readonly rasterizer: Rasterizer;
  readonly normalizeRaster: (bytes: Uint8Array) => Promise<Result<RasterImage, RasterError>>;
}

const MAX_RASTER_BYTES = 10 * 1024 * 1024; // 01_PRODUCT_MVP.md §3
const MAX_SVG_BYTES = 5 * 1024 * 1024;
const MIME: Record<Exclude<DetectedType, 'unknown'>, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

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

async function derive(
  deps: ScanDeps,
  bytes: Uint8Array,
  type: DetectedType,
): Promise<Result<Derived, AssetErrorCode>> {
  if (type === 'unknown') return err('ASSET_TYPE_UNSUPPORTED');
  if (type === 'svg') {
    if (bytes.length > MAX_SVG_BYTES) return err('ASSET_TOO_LARGE');
    const sanitized = sanitizeSvg(bytes);
    if (!sanitized.ok) return err(sanitized.error.code);
    const svg = await ensureViewBox(sanitized.value, deps.rasterizer);
    if (!svg.ok) return err(assetCode(svg.error.code));
    return ok({
      bytes: new TextEncoder().encode(svg.value),
      mime: MIME.svg,
      width: null,
      height: null,
    });
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
  const reject = async (code: AssetErrorCode, mime: string | null = null): Promise<void> => {
    await orm.update(assets).set({ status: 'rejected', rejectReason: code, mime }).where(pending);
  };

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
        meta: { sanitizedAssetId: sanitizedId },
      })
      .where(pending)
      .returning({ id: assets.id });
    if (!moved) return;
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
      meta: { sourceAssetId: asset.id },
    });
  });
}
