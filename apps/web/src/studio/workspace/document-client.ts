import { BrandDocumentSchema, type BrandDocument, type Command } from '@app/document';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { Fetcher } from '../upload';

// Browser side of 04_API_CONTRACTS §3 "Document": the studio reads the project, then every edit (inspector
// or copilot) is a typed command sent with the revision it was made on. The answer carries the new revision
// and the whole document, so the canvas always draws what the server stored, never a local guess.
export const ProjectSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  industryLabel: z.string().nullable(),
  language: z.enum(['fr', 'en']),
  briefText: z.string().nullable(),
  status: z.string(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

const ProjectAnswer = z.object({
  project: ProjectSummarySchema,
  document: z.object({ seq: z.number().int().nonnegative(), body: z.unknown() }).nullable(),
});

const RevisionAnswer = z.object({ seq: z.number().int().nonnegative(), document: z.unknown() });
const Problem = z.object({ code: z.string().min(1) });

export interface Revision {
  readonly seq: number;
  readonly document: BrandDocument;
}

export interface ProjectState {
  readonly project: ProjectSummary;
  readonly revision: Revision | null;
}

export type DocumentFailure =
  | { readonly kind: 'http'; readonly status: number; readonly code: string }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'network' };

const base = (projectId: string): string => `/api/v1/projects/${encodeURIComponent(projectId)}`;

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

async function problem(response: Response): Promise<DocumentFailure> {
  const parsed = Problem.safeParse(await response.json().catch(() => null));
  return {
    kind: 'http',
    status: response.status,
    code: parsed.success ? parsed.data.code : 'HTTP_ERROR',
  };
}

async function call(
  fetcher: Fetcher,
  url: string,
  init?: RequestInit,
): Promise<Result<unknown, DocumentFailure>> {
  try {
    const response = await fetcher(url, init);
    if (!response.ok) return err(await problem(response));
    return ok(await response.json().catch(() => null));
  } catch (error) {
    // fetch rejects only when no answer came back (offline, DNS).
    if (error instanceof TypeError) return err({ kind: 'network' });
    throw error;
  }
}

function revisionOf(seq: number, body: unknown): Result<Revision, DocumentFailure> {
  const document = BrandDocumentSchema.safeParse(body);
  return document.success ? ok({ seq, document: document.data }) : err({ kind: 'invalid' });
}

export async function loadProject(
  fetcher: Fetcher,
  projectId: string,
): Promise<Result<ProjectState, DocumentFailure>> {
  const answer = await call(fetcher, base(projectId));
  if (!answer.ok) return answer;
  const parsed = ProjectAnswer.safeParse(answer.value);
  if (!parsed.success) return err({ kind: 'invalid' });
  const { project, document } = parsed.data;
  if (document === null) return ok({ project, revision: null });
  const revision = revisionOf(document.seq, document.body);
  return revision.ok ? ok({ project, revision: revision.value }) : revision;
}

async function revisionCall(
  fetcher: Fetcher,
  url: string,
  body: unknown,
): Promise<Result<Revision, DocumentFailure>> {
  const answer = await call(fetcher, url, post(body));
  if (!answer.ok) return answer;
  const parsed = RevisionAnswer.safeParse(answer.value);
  return parsed.success
    ? revisionOf(parsed.data.seq, parsed.data.document)
    : err({ kind: 'invalid' });
}

export function sendCommand(
  fetcher: Fetcher,
  projectId: string,
  baseSeq: number,
  command: Command,
): Promise<Result<Revision, DocumentFailure>> {
  return revisionCall(fetcher, `${base(projectId)}/commands`, { baseSeq, command });
}

export function undoLast(
  fetcher: Fetcher,
  projectId: string,
  baseSeq: number,
): Promise<Result<Revision, DocumentFailure>> {
  return revisionCall(fetcher, `${base(projectId)}/undo`, { baseSeq });
}

export function redoLast(
  fetcher: Fetcher,
  projectId: string,
  baseSeq: number,
): Promise<Result<Revision, DocumentFailure>> {
  return revisionCall(fetcher, `${base(projectId)}/redo`, { baseSeq });
}

/** URL of a stored asset (sanitised logo, variant, favicon), served by GET /assets/:id/content. */
export const assetUrl = (assetId: string): string =>
  `/api/v1/assets/${encodeURIComponent(assetId)}/content`;
