import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { StudioWorkspace } from '../../../studio/workspace/studio-workspace';

// 09 §7 `/studio/[id]`: the studio. Access is checked by every API call the client makes (can(), ADR-025):
// this page only renders the shell and holds no project data.
const ProjectId = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('workspace');
  return { title: t('metaTitle') };
}

export default async function StudioProjectPage(props: PageProps<'/studio/[id]'>) {
  const { id } = await props.params;
  const projectId = ProjectId.safeParse(id);
  if (!projectId.success) notFound();
  return <StudioWorkspace projectId={projectId.data} />;
}
