import { BriefDocMetaSchema, buildBrandContext } from '@app/contracts';
import { and, assets, desc, eq, isNull, projects, type createDatabase } from '@app/db';
import { err, ok, type Result } from '@app/kernel';

type Orm = ReturnType<typeof createDatabase>['orm'];

/**
 * What the brand analysis (step 3, Gemini) reads about the brand: the typed brief and the manifest document,
 * cleaned, fenced and announced as untrusted data. Empty string when the user gave neither. A manifest row
 * whose meta no longer reads back is reported, not silently dropped.
 */
export async function loadBrandContext(
  orm: Orm,
  projectId: string,
): Promise<Result<string, 'BRIEF_DOC_META_INVALID' | 'PROJECT_MISSING'>> {
  const [project] = await orm
    .select({ briefText: projects.briefText })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return err('PROJECT_MISSING');
  const [doc] = await orm
    .select({ meta: assets.meta })
    .from(assets)
    .where(
      and(
        eq(assets.projectId, projectId),
        eq(assets.kind, 'brief_doc'),
        eq(assets.status, 'clean'),
        isNull(assets.deletedAt),
      ),
    )
    .orderBy(desc(assets.id))
    .limit(1);
  if (!doc) return ok(buildBrandContext({ briefText: project.briefText, manifestText: null }));
  const meta = BriefDocMetaSchema.safeParse(doc.meta);
  if (!meta.success) return err('BRIEF_DOC_META_INVALID');
  return ok(buildBrandContext({ briefText: project.briefText, manifestText: meta.data.text }));
}
