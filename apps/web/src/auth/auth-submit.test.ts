import { describe, expect, it, vi } from 'vitest';
import { createSubmit, interpretClaim, type AuthClientPort, type ClaimResult } from './auth-submit';

const values = { name: 'Awa', email: 'awa@example.com', password: 'une phrase de passe' };
const claimed = () => Promise.resolve<ClaimResult>('claimed');

function port(
  error: { status?: number; code?: string; retryAfterSeconds?: number } | null,
): AuthClientPort {
  return {
    signIn: { email: vi.fn(() => Promise.resolve({ error })) },
    signUp: { email: vi.fn(() => Promise.resolve({ error })) },
  };
}

describe('createSubmit', () => {
  it('signs in with e-mail and password, then claims the guest projects', async () => {
    const client = port(null);
    const claim = vi.fn(claimed);
    const outcome = await createSubmit(client, claim)('login', values);
    expect(outcome).toEqual({ ok: true });
    expect(client.signIn.email).toHaveBeenCalledWith({
      email: values.email,
      password: values.password,
    });
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('signs up with the name and claims too', async () => {
    const client = port(null);
    const claim = vi.fn(claimed);
    await createSubmit(client, claim)('signup', values);
    expect(client.signUp.email).toHaveBeenCalledWith(values);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('signs in right after the sign-up, which sets no session', async () => {
    const client = port(null);
    await createSubmit(client, claimed)('signup', values);
    expect(client.signIn.email).toHaveBeenCalledWith({
      email: values.email,
      password: values.password,
    });
  });

  it('never reveals an existing address: a refused sign-in after sign-up is a neutral failure', async () => {
    const client: AuthClientPort = {
      signUp: { email: () => Promise.resolve({ error: null }) },
      signIn: { email: () => Promise.resolve({ error: { status: 401 } }) },
    };
    const claim = vi.fn(claimed);
    expect(await createSubmit(client, claim)('signup', values)).toEqual({
      ok: false,
      failure: 'signupFailed',
    });
    expect(claim).not.toHaveBeenCalled();
  });

  it('passes the Retry-After delay of a 429 on', async () => {
    const outcome = await createSubmit(port({ status: 429, retryAfterSeconds: 540 }), claimed)(
      'login',
      values,
    );
    expect(outcome).toEqual({ ok: false, failure: 'rateLimited', retryAfterSeconds: 540 });
  });

  it('reports a network failure when fetch rejects, and a generic one for any other exception', async () => {
    const rejecting = (reason: Error): AuthClientPort => ({
      signIn: { email: () => Promise.reject(reason) },
      signUp: { email: () => Promise.reject(reason) },
    });
    expect(
      await createSubmit(rejecting(new TypeError('offline')), claimed)('login', values),
    ).toEqual({
      ok: false,
      failure: 'network',
    });
    expect(await createSubmit(rejecting(new RangeError('bug')), claimed)('login', values)).toEqual({
      ok: false,
      failure: 'generic',
    });
  });

  it('signs in but says so when the guest projects could not be attached', async () => {
    const quota = await createSubmit(port(null), () => Promise.resolve<ClaimResult>('quota'))(
      'login',
      values,
    );
    expect(quota).toEqual({ ok: true, claim: 'quota' });
    const failed = await createSubmit(port(null), () => Promise.reject(new Error('down')))(
      'login',
      values,
    );
    expect(failed).toEqual({ ok: true, claim: 'failed' });
  });
});

describe('interpretClaim', () => {
  const problem = (status: number, code: string) =>
    new Response(JSON.stringify({ code }), { status });

  it('reads the claim answer: attached, account full, or failed', async () => {
    expect(await interpretClaim(Response.json({ claimed: 1 }))).toBe('claimed');
    expect(await interpretClaim(problem(403, 'QUOTA_PROJECTS'))).toBe('quota');
    expect(await interpretClaim(problem(403, 'FORBIDDEN'))).toBe('failed');
    expect(await interpretClaim(new Response('boom', { status: 500 }))).toBe('failed');
  });
});
