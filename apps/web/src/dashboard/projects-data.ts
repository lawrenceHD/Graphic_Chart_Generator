import { z } from 'zod';

// GET /api/v1/projects (04_API_CONTRACTS.md §3): the answer is data from the network, validated here.
const ProjectRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  industryLabel: z.string().nullable(),
  language: z.enum(['fr', 'en']),
  briefText: z.string().nullable(),
  status: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const ListSchema = z.object({
  items: z.array(ProjectRowSchema),
  nextCursor: z.string().nullable(),
});

export type ProjectRow = z.infer<typeof ProjectRowSchema>;
export type ProjectsState =
  | { readonly kind: 'ready'; readonly projects: readonly ProjectRow[] }
  | { readonly kind: 'empty' }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'error' };

export type ListFetcher = (path: string) => Promise<Response>;

export async function loadProjects(fetcher: ListFetcher): Promise<ProjectsState> {
  let response: Response;
  try {
    response = await fetcher('/api/v1/projects?limit=50');
  } catch {
    return { kind: 'error' };
  }
  if (response.status === 401) return { kind: 'signed-out' };
  if (!response.ok) return { kind: 'error' };
  const body: unknown = await response.json().catch(() => null);
  const parsed = ListSchema.safeParse(body);
  if (!parsed.success) return { kind: 'error' };
  return parsed.data.items.length === 0
    ? { kind: 'empty' }
    : { kind: 'ready', projects: parsed.data.items };
}
