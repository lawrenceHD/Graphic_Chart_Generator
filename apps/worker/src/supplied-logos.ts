import { LogoAssetMetaSchema, variantKindForRole, type VariantKind } from '@app/contracts';
import { and, assets, eq, isNull, type createDatabase } from '@app/db';

type Orm = ReturnType<typeof createDatabase>['orm'];

/**
 * Kit slots filled by logos the user supplied (a black version, an icon, a horizontal lockup…): those are
 * used as they are instead of being derived. Newest logo of a role wins; the primary never counts.
 */
export function suppliedVariants(
  primaryId: string,
  logos: readonly { readonly id: string; readonly meta: unknown }[],
): ReadonlyMap<VariantKind, string> {
  const slots = new Map<VariantKind, string>();
  for (const logo of [...logos].sort((a, b) => a.id.localeCompare(b.id))) {
    if (logo.id === primaryId) continue;
    const meta = LogoAssetMetaSchema.safeParse(logo.meta);
    const kind =
      meta.success && meta.data.role !== undefined ? variantKindForRole(meta.data.role) : null;
    if (kind !== null) slots.set(kind, logo.id);
  }
  return slots;
}

export async function loadSuppliedVariants(
  orm: Orm,
  projectId: string,
  primaryId: string,
): Promise<ReadonlyMap<VariantKind, string>> {
  const rows = await orm
    .select({ id: assets.id, meta: assets.meta })
    .from(assets)
    .where(
      and(
        eq(assets.projectId, projectId),
        eq(assets.kind, 'logo_sanitized'),
        eq(assets.status, 'clean'),
        isNull(assets.deletedAt),
      ),
    );
  return suppliedVariants(primaryId, rows);
}
