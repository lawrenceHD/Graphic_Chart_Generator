import { randomBytes } from 'node:crypto';
import { and, appendProjectEvent, assets, eq, isNull, type createDatabase } from '@app/db';
import { uuidV7 } from '@app/kernel';

// Asset rows of the upload flow (02_ARCHITECTURE.md §5.1): pending → quarantined here, then the worker's
// asset.scan decides clean | rejected. Authorisation happens before any of these calls.
type Orm = ReturnType<typeof createDatabase>['orm'];
export type AssetRow = typeof assets.$inferSelect;

/** 01_PRODUCT_MVP.md §3: rasters up to 10 MB; the scan applies the 5 MB SVG limit once the type is known. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Server-generated object key (SEC-11): nothing from the client reaches it. */
export const originalKey = (projectId: string, assetId: string): string =>
  `projects/${projectId}/assets/${assetId}/original`;

export async function declareAsset(
  orm: Orm,
  projectId: string,
  bytes: number,
  fileName: string,
): Promise<AssetRow> {
  const id = uuidV7(Date.now(), randomBytes(10));
  const [row] = await orm
    .insert(assets)
    .values({
      id,
      projectId,
      kind: 'logo_original',
      storageKey: originalKey(projectId, id),
      bytes,
      meta: { fileName },
    })
    .returning();
  if (!row) throw new Error('insert returned no row');
  return row;
}

export async function findAsset(orm: Orm, assetId: string): Promise<AssetRow | undefined> {
  const [row] = await orm
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), isNull(assets.deletedAt)));
  return row;
}

/** pending → quarantined; a concurrent completion finds the row already moved and gets it unchanged. */
export async function quarantineAsset(orm: Orm, assetId: string): Promise<AssetRow | undefined> {
  // The transition and its SSE event commit together (04_API_CONTRACTS.md §5).
  const moved = await orm.transaction(async (tx) => {
    const [row] = await tx
      .update(assets)
      .set({ status: 'quarantined' })
      .where(and(eq(assets.id, assetId), eq(assets.status, 'pending')))
      .returning();
    if (row)
      await appendProjectEvent(tx, row.projectId, {
        type: 'asset.status',
        data: { assetId, status: 'quarantined' },
      });
    return row;
  });
  return moved ?? findAsset(orm, assetId);
}

/** Public shape: the storage key and internal metadata stay on the server. */
export const publicAsset = (row: AssetRow) => ({
  id: row.id,
  projectId: row.projectId,
  kind: row.kind,
  status: row.status,
  mime: row.mime,
  bytes: row.bytes,
  width: row.width,
  height: row.height,
  rejectReason: row.rejectReason,
  createdAt: row.createdAt.toISOString(),
});
