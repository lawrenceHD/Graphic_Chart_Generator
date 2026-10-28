import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { Fetcher } from '../studio/upload';

// "Démarrer" (US-01): create the project; without a usable session, open a guest session behind the
// anti-bot check (04 §3) and try once more. A guest already holding its one project gets a fresh session.
export type StartFailure =
  | { readonly kind: 'http'; readonly status: number; readonly code: string }
  | { readonly kind: 'turnstile' }
  | { readonly kind: 'network' };

export interface StartInput {
  readonly title: string;
  readonly briefText?: string | undefined;
}

const Created = z.object({ project: z.object({ id: z.uuid() }) });
const Problem = z.object({ code: z.string().min(1) });

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

async function failure(response: Response): Promise<StartFailure> {
  const problem = Problem.safeParse(await response.json().catch(() => null));
  return {
    kind: 'http',
    status: response.status,
    code: problem.success ? problem.data.code : 'HTTP_ERROR',
  };
}

async function create(fetcher: Fetcher, input: StartInput): Promise<Response> {
  const body = {
    title: input.title,
    language: 'fr',
    ...(input.briefText ? { briefText: input.briefText } : {}),
  };
  return fetcher('/api/v1/projects', post({ ...body }));
}

async function created(response: Response): Promise<Result<string, StartFailure>> {
  if (!response.ok) return err(await failure(response));
  const parsed = Created.safeParse(await response.json().catch(() => null));
  return parsed.success
    ? ok(parsed.data.project.id)
    : err({ kind: 'http', status: response.status, code: 'INVALID_RESPONSE' });
}

async function steps(
  fetcher: Fetcher,
  input: StartInput,
  turnstileToken: () => Promise<string | null>,
): Promise<Result<string, StartFailure>> {
  const first = await create(fetcher, input);
  if (first.status !== 401 && first.status !== 403) return created(first);
  const token = await turnstileToken();
  if (token === null) return err({ kind: 'turnstile' });
  const session = await fetcher('/api/v1/guest-sessions', post({ turnstileToken: token }));
  if (!session.ok) return err(await failure(session));
  return created(await create(fetcher, input));
}

export async function startProject(
  fetcher: Fetcher,
  input: StartInput,
  turnstileToken: () => Promise<string | null>,
): Promise<Result<string, StartFailure>> {
  try {
    return await steps(fetcher, input, turnstileToken);
  } catch (error) {
    // fetch rejects only when no answer came back (offline, DNS): the form offers a retry.
    if (error instanceof TypeError) return err({ kind: 'network' });
    throw error;
  }
}
