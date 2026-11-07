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

/**
 * Signs in, or signs up then signs in (sign-up sets no session cookie: the answer is the same for a new and a
 * taken address). A failed sign-in after a sign-up gets a neutral message that never says whether the address
 * existed. The guest projects are then attached to the account; that claim is best effort: the guest cookie
 * stays valid for the next sign-in.
 */
export function createSubmit(client: AuthClientPort, claim: () => Promise<void>): AuthSubmit {
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
    } catch {
      return { ok: false, failure: 'network' };
    }
    await claim().catch(() => undefined);
    return { ok: true };
  };
}

function refusal(error: NonNullable<Answer['error']>) {
  const failure = failureKey(error);
  return error.retryAfterSeconds === undefined
    ? ({ ok: false, failure } as const)
    : ({ ok: false, failure, retryAfterSeconds: error.retryAfterSeconds } as const);
}

/** Browser claim of the guest projects; a refusal is ignored by createSubmit. */
export async function claimGuestProjects(): Promise<void> {
  const response = await fetch('/api/v1/guest-sessions/claim', { method: 'POST', body: '{}' });
  if (!response.ok) throw new Error('claim refused');
}
