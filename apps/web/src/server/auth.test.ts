import { account, eq, user } from '@app/db';
import { createTestDatabase, integrationDatabaseUrl, type TestDatabase } from '@app/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actorFromSession, createAuth, type Auth } from './auth';

const adminUrl = integrationDatabaseUrl();
const settings = {
  APP_URL: 'http://localhost:3000',
  AUTH_SECRET: 'test-only-secret-with-enough-entropy-0123456789',
};

describe.runIf(adminUrl !== '')('Better Auth integration (T-013 decision, T-016)', () => {
  let test: TestDatabase;
  let auth: Auth;
  beforeAll(async () => {
    test = await createTestDatabase(adminUrl);
    // The compromised-password check calls an external API: off in tests, on in production.
    auth = createAuth(test.database.orm, settings, { checkCompromisedPasswords: false });
  });
  afterAll(async () => {
    await test.dispose();
  });

  it('signs up with an Argon2id password hash (SEC-01) and an unverified e-mail', async () => {
    const signed = await auth.api.signUpEmail({
      body: { email: 'ada@example.invalid', password: 'a long enough passphrase', name: 'Ada' },
    });
    const [stored] = await test.database.orm
      .select()
      .from(account)
      .where(eq(account.userId, signed.user.id));
    const [row] = await test.database.orm.select().from(user).where(eq(user.id, signed.user.id));

    expect(stored?.password).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row?.emailVerified).toBe(false);
  });

  it('refuses passwords shorter than 10 characters', async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: 'bob@example.invalid', password: 'short-9ch', name: 'Bob' },
      }),
    ).rejects.toThrow();
  });

  it('signs in and resolves the session into a can() actor', async () => {
    await auth.api.signUpEmail({
      body: { email: 'eve@example.invalid', password: 'another long passphrase', name: 'Eve' },
    });
    const signedIn = await auth.api.signInEmail({
      body: { email: 'eve@example.invalid', password: 'another long passphrase' },
      returnHeaders: true,
    });
    const cookie = signedIn.headers.get('set-cookie') ?? '';
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(actorFromSession(session)).toEqual({
      kind: 'user',
      userId: signedIn.response.user.id,
      emailVerified: false,
    });
    expect(actorFromSession(null)).toBeNull();
  });

  it('rejects a wrong password without revealing whether the account exists', async () => {
    // Handlers attached at once: the unknown account can fail before the Argon2 check of the known one ends,
    // and a rejection waiting unhandled meanwhile is reported by Vitest as an error.
    const message = (attempt: Promise<unknown>): Promise<string> =>
      attempt.then(
        () => 'accepted',
        (error: unknown) => (error instanceof Error ? error.message : 'error'),
      );
    const [wrong, unknown] = await Promise.all([
      message(
        auth.api.signInEmail({
          body: { email: 'eve@example.invalid', password: 'not the password!' },
        }),
      ),
      message(
        auth.api.signInEmail({
          body: { email: 'nobody@example.invalid', password: 'not the password!' },
        }),
      ),
    ]);
    expect(wrong).toBe(unknown);
    expect(wrong).not.toBe('accepted');
  });
});
