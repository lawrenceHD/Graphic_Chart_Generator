import { userText, type JobQueue, type ObjectStorage } from '@app/contracts';
import { z } from 'zod';
import {
  declareAsset,
  MAX_UPLOAD_BYTES,
  publicAsset,
  quarantineAsset,
  type AssetRow,
} from './asset-service';
import { clientIp, problemResponse, readJson, tooManyRequests } from './http';
import type { RateLimiter } from './rate-limiter';
import { guardAsset, guardProject, type RouteDeps, type RouteParams } from './route-guard';

// 04_API_CONTRACTS.md §3 "Assets" and §6 (ADR-023). The browser uploads straight to R2; the application
// never proxies file bytes, and only `clean` derived assets are ever served.
export interface AssetRouteDeps extends RouteDeps {
  readonly storage: ObjectStorage;
  readonly queue: JobQueue;
  readonly limiter: RateLimiter;
}

// 04_API_CONTRACTS.md §7: upload declarations, per identity and per IP.
const DECLARATIONS_PER_ACTOR = { max: 15, windowMs: 60_000 };
const DECLARATIONS_PER_IP = { max: 30, windowMs: 60_000 };

// The announced type is ignored (SEC-12): the scan reads the magic bytes. The file name is kept for display.
const DeclareBody = z
  .object({
    kind: z.literal('logo_original'),
    fileName: userText(255, 1),
    bytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  })
  .strict();

type Context = { params: RouteParams };

const assetJson = (row: AssetRow, status = 200): Response =>
  Response.json({ asset: publicAsset(row) }, { status });

export function assetHandlers(deps: AssetRouteDeps) {
  const enqueueScan = (assetId: string) => deps.queue.send('asset.scan', { assetId }, assetId);

  return {
    async declareUpload(request: Request, context: Context): Promise<Response> {
      const guard = await guardProject(deps, request, context.params, 'asset:create');
      if (!guard.ok) return guard.error;
      const { actor } = guard.value;
      const identity =
        actor.kind === 'user'
          ? actor.userId
          : actor.kind === 'guest'
            ? actor.guestSessionId
            : actor.kind;
      const wait = await deps.limiter.hit([
        { key: `upload:${identity}`, limit: DECLARATIONS_PER_ACTOR },
        { key: `upload-ip:${clientIp(request) ?? 'unknown'}`, limit: DECLARATIONS_PER_IP },
      ]);
      if (wait > 0) return tooManyRequests(request, wait);
      const body = await readJson(request, DeclareBody);
      if (!body.ok) return body.error;
      const row = await declareAsset(
        deps.orm,
        guard.value.params.id,
        body.value.bytes,
        body.value.fileName,
      );
      const upload = await deps.storage.presignPut(row.storageKey, body.value.bytes);
      return Response.json(
        {
          asset: publicAsset(row),
          upload: { ...upload, expiresAt: upload.expiresAt.toISOString() },
        },
        { status: 201 },
      );
    },

    async complete(request: Request, context: Context): Promise<Response> {
      const guard = await guardAsset(deps, request, context.params, 'asset:create');
      if (!guard.ok) return guard.error;
      const { asset } = guard.value;
      if (asset.status === 'pending') {
        const stored = await deps.storage.head(asset.storageKey);
        if (stored === null)
          return problemResponse(request, 409, 'UPLOAD_MISSING', 'object not uploaded yet');
        if (stored.bytes !== asset.bytes)
          return problemResponse(request, 409, 'UPLOAD_SIZE_MISMATCH', 'size differs');
      }
      if (asset.status === 'clean' || asset.status === 'rejected') return assetJson(asset);
      // Status first, then the job: a failed send leaves a quarantined asset that a retried call re-enqueues.
      const moved = (await quarantineAsset(deps.orm, asset.id)) ?? asset;
      if (moved.status === 'quarantined') await enqueueScan(asset.id);
      return assetJson(moved, 202);
    },

    async read(request: Request, context: Context): Promise<Response> {
      const guard = await guardAsset(deps, request, context.params, 'asset:read');
      return guard.ok ? assetJson(guard.value.asset) : guard.error;
    },

    async content(request: Request, context: Context): Promise<Response> {
      const guard = await guardAsset(deps, request, context.params, 'asset:read');
      if (!guard.ok) return guard.error;
      const { asset } = guard.value;
      // Originals are never served, and nothing is served before the scan (SEC-16).
      if (asset.status !== 'clean' || asset.kind === 'logo_original' || asset.mime === null)
        return problemResponse(request, 404, 'NOT_FOUND', 'no such resource');
      const exported = asset.kind === 'export_pdf' || asset.kind === 'export_zip';
      const location = await deps.storage.presignGet(asset.storageKey, {
        contentType: asset.mime,
        disposition: exported ? 'attachment' : 'inline',
      });
      return new Response(null, {
        status: 302,
        headers: {
          location,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    },
  };
}
