import { describe, expect, it, vi } from 'vitest';
import { createSubmit, type AuthClientPort } from './auth-submit';

const values = { name: 'Awa', email: 'awa@example.com', password: 'une phrase de passe' };

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
    const claim = vi.fn(() => Promise.resolve());
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
    const claim = vi.fn(() => Promise.resolve());
    await createSubmit(client, claim)('signup', values);
    expect(client.signUp.email).toHaveBeenCalledWith(values);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('signs in right after the sign-up, which sets no session', async () => {
    const client = port(null);
    await createSubmit(client, () => Promise.resolve())('signup', values);
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
    const claim = vi.fn(() => Promise.resolve());
    expect(await createSubmit(client, claim)('signup', values)).toEqual({
      ok: false,
      failure: 'signupFailed',
    });
    expect(claim).not.toHaveBeenCalled();
  });

  it('passes the Retry-After delay of a 429 on', async () => {
    const outcome = await createSubmit(port({ status: 429, retryAfterSeconds: 540 }), () =>
      Promise.resolve(),
    )('login', values);
    expect(outcome).toEqual({ ok: false, failure: 'rateLimited', retryAfterSeconds: 540 });
  });

  it('reports a network failure when the request throws', async () => {
    const client: AuthClientPort = {
      signIn: { email: () => Promise.reject(new TypeError('offline')) },
      signUp: { email: () => Promise.reject(new TypeError('offline')) },
    };
    expect(await createSubmit(client, () => Promise.resolve())('login', values)).toEqual({
      ok: false,
      failure: 'network',
    });
  });

  it('still signs in when the claim fails: the guest cookie stays for the next sign-in', async () => {
    const outcome = await createSubmit(port(null), () => Promise.reject(new Error('down')))(
      'login',
      values,
    );
    expect(outcome).toEqual({ ok: true });
  });
});
