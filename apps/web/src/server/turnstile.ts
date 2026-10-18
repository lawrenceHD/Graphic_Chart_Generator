import { z } from 'zod';

// Cloudflare Turnstile server-side check (anti-bot on guest session creation, 04_API_CONTRACTS.md §3).
// `fetch` is injected: the external call is a boundary, and its answer is validated by Zod.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const Answer = z.object({ success: z.boolean() });

export type TurnstileVerifier = (token: string, remoteIp: string | null) => Promise<boolean>;

export function createTurnstileVerifier(
  secret: string,
  fetchImpl: typeof fetch = fetch,
): TurnstileVerifier {
  return async (token, remoteIp) => {
    if (token.length === 0 || token.length > 2048) return false;
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp !== null) form.set('remoteip', remoteIp);
    try {
      const response = await fetchImpl(VERIFY_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return false;
      const answer = Answer.safeParse(await response.json());
      return answer.success && answer.data.success;
    } catch {
      // Network failure or timeout: fail closed, the client can retry.
      return false;
    }
  };
}
