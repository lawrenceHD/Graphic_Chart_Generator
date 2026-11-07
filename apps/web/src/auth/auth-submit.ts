import { z } from 'zod';
import { failureKey } from './auth-logic';
import type { AuthSubmit } from './auth-form';

/** The part of the Better Auth client this screen uses (04_API_CONTRACTS.md §3: /api/auth/*). */
export interface Answer {
  readonly error: {
    readonly status?: number | undefined;
    readonly code?: string | undefined;
    /** Retry-After of a 429, read from the response by the adapter. */
    readonly retryAfterSeconds?: number | undefined;
  } | null;
}
export interface AuthClientPort {
  readonly signIn: {
    readonly email: (input: { email: string; password: string }) => Promise<Answer>;
  };
  readonly signUp: {
    readonly email: (input: { name: string; email: string; password: string }) => Promise<Answer>;
  };
}

/** Outcome of attaching the guest projects: done, account full (QUOTA_PROJECTS), or not possible. */
export type ClaimResult = 'claimed' | 'quota' | 'failed';

/**
 * Signs in, or signs up then signs in (sign-up sets no session cookie: the answer is the same for a new and a
 * taken address). A failed sign-in after a sign-up gets a neutral message that never says whether the address
 * existed. The guest projects are then attached; if that does not work the visitor is told (the account exists
 * either way, and the trial project stays intact on the guest cookie).
 */
export function createSubmit(
  client: AuthClientPort,
  claim: () => Promise<ClaimResult>,
): AuthSubmit {
  return async (mode, values) => {
    try {
      if (mode === 'signup') {
        const created = await client.signUp.email({
          name: values.name ?? '',
          email: values.email,
          password: values.password,
        });
        if (created.error !== null) return refusal(created.error);
      }
      const session = await client.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (session.error !== null) {
        const failure = failureKey(session.error);
        return mode === 'signup' && failure === 'invalidCredentials'
          ? { ok: false, failure: 'signupFailed' }
          : refusal(session.error);
      }
    } catch (error) {
      // fetch rejects with a TypeError when no answer came back; anything else is not a network problem.
      return { ok: false, failure: error instanceof TypeError ? 'network' : 'generic' };
    }
    const attached: ClaimResult = await claim().catch((): ClaimResult => 'failed');
    return attached === 'claimed' ? { ok: true } : { ok: true, claim: attached };
  };
}

function refusal(error: NonNullable<Answer['error']>) {
  const failure = failureKey(error);
  return error.retryAfterSeconds === undefined
    ? ({ ok: false, failure } as const)
    : ({ ok: false, failure, retryAfterSeconds: error.retryAfterSeconds } as const);
}

const Problem = z.object({ code: z.string() });

/** POST /guest-sessions/claim answer (04 §3): 200 attached, 403 QUOTA_PROJECTS when the account is full. */
export async function interpretClaim(response: Response): Promise<ClaimResult> {
  if (response.ok) return 'claimed';
  const problem = Problem.safeParse(await response.json().catch(() => null));
  return response.status === 403 && problem.success && problem.data.code === 'QUOTA_PROJECTS'
    ? 'quota'
    : 'failed';
}

/** Browser claim of the guest projects. A network failure rejects; createSubmit turns it into 'failed'. */
export async function claimGuestProjects(): Promise<ClaimResult> {
  return interpretClaim(
    await fetch('/api/v1/guest-sessions/claim', { method: 'POST', body: '{}' }),
  );
}
