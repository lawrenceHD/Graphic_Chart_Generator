'use client';

import { createAuthClient } from 'better-auth/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTurnstile } from '../start/turnstile';
import { AuthForm } from './auth-form';
import type { AuthMode } from './auth-logic';
import { claimGuestProjects, createSubmit, type Answer, type AuthClientPort } from './auth-submit';

const authClient = createAuthClient();

type Hooks = { readonly onError: (context: { readonly response: Response }) => void };

/** Runs a client call and adds the Retry-After header of a refusal to its error (429 after 5 attempts). */
async function withRetryAfter(call: (fetchOptions: Hooks) => Promise<Answer>): Promise<Answer> {
  let seconds: number | undefined;
  const answer = await call({
    onError: ({ response }) => {
      const header = Number(response.headers.get('retry-after'));
      if (Number.isFinite(header) && header > 0) seconds = header;
    },
  });
  return answer.error === null || seconds === undefined
    ? answer
    : { error: { ...answer.error, retryAfterSeconds: seconds } };
}

const TURNSTILE_HEADER = 'x-turnstile-token';
const TURNSTILE_REFUSED: Answer = { error: { status: 403, code: 'TURNSTILE_FAILED' } };

/** Sign-in needs no anti-bot check; sign-up sends the widget token in the header the server guard reads. */
function makePort(getToken: () => Promise<string | null>): AuthClientPort {
  return {
    signIn: {
      email: (input) =>
        withRetryAfter((fetchOptions) => authClient.signIn.email({ ...input, fetchOptions })),
    },
    signUp: {
      email: async (input) => {
        const token = await getToken();
        if (token === null) return TURNSTILE_REFUSED;
        return withRetryAfter((fetchOptions) =>
          authClient.signUp.email({
            ...input,
            fetchOptions: { ...fetchOptions, headers: { [TURNSTILE_HEADER]: token } },
          }),
        );
      },
    },
  };
}

/** Leaf wiring the form to Better Auth; on success the visitor lands on their projects. */
export function AuthPanel({
  mode,
  turnstileSiteKey,
}: {
  readonly mode: AuthMode;
  /** Public site key of the anti-bot widget; the sign-up page passes it, the sign-in page has no use for it. */
  readonly turnstileSiteKey: string;
}) {
  const { box, getToken } = useTurnstile(turnstileSiteKey);
  const router = useRouter();
  const submit = useMemo(() => {
    const send = createSubmit(makePort(getToken), claimGuestProjects);
    return async (...args: Parameters<typeof send>) => {
      const outcome = await send(...args);
      // A claim problem is told by the form, with a link: no silent redirect over it.
      if (outcome.ok && outcome.claim === undefined) router.push('/projets');
      return outcome;
    };
  }, [router, getToken]);
  return (
    <>
      <AuthForm mode={mode} submit={submit} />
      <div ref={box} />
    </>
  );
}
