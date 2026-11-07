'use client';

import { createAuthClient } from 'better-auth/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
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

const port: AuthClientPort = {
  signIn: {
    email: (input) =>
      withRetryAfter((fetchOptions) => authClient.signIn.email({ ...input, fetchOptions })),
  },
  signUp: {
    email: (input) =>
      withRetryAfter((fetchOptions) => authClient.signUp.email({ ...input, fetchOptions })),
  },
};

/** Leaf wiring the form to Better Auth; on success the visitor lands on their projects. */
export function AuthPanel({ mode }: { readonly mode: AuthMode }) {
  const router = useRouter();
  const submit = useMemo(() => {
    const send = createSubmit(port, claimGuestProjects);
    return async (...args: Parameters<typeof send>) => {
      const outcome = await send(...args);
      // A claim problem is told by the form, with a link: no silent redirect over it.
      if (outcome.ok && outcome.claim === undefined) router.push('/projets');
      return outcome;
    };
  }, [router]);
  return <AuthForm mode={mode} submit={submit} />;
}
