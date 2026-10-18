import type { Actor } from '@app/contracts';
import { account, rateLimit, session, user, verification, type createDatabase } from '@app/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { haveIBeenPwned } from 'better-auth/plugins/haveibeenpwned';
import { hashPassword, verifyPassword } from '../lib/password';

// Better Auth 1.7.7 configured as decided by the T-013 spike (sortie tikets/T-013.md), SEC-01 to SEC-06.
type Orm = ReturnType<typeof createDatabase>['orm'];

const DAY_SECONDS = 24 * 60 * 60;
const SESSION_DAYS = 30;
const RESET_TOKEN_SECONDS = 30 * 60;
const SIGN_IN_WINDOW_SECONDS = 15 * 60;
const SIGN_IN_MAX_ATTEMPTS = 5;

export interface AuthSettings {
  readonly APP_URL: string;
  readonly AUTH_SECRET: string;
}
export interface AuthOptions {
  /** HaveIBeenPwned k-anonymity lookup (5 SHA-1 characters leave the server); disabled in tests only. */
  readonly checkCompromisedPasswords?: boolean;
}

export function createAuth(orm: Orm, settings: AuthSettings, options: AuthOptions = {}) {
  const secureCookies = settings.APP_URL.startsWith('https://');
  return betterAuth({
    appName: 'Atelier',
    baseURL: settings.APP_URL,
    secret: settings.AUTH_SECRET,
    trustedOrigins: [settings.APP_URL], // SEC-06
    database: drizzleAdapter(orm, {
      provider: 'pg',
      schema: { user, session, account, verification, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10, // SEC-01
      maxPasswordLength: 128,
      // SEC-03 gates exports and sharing (through can()), not sign-in.
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS, // SEC-04
      revokeSessionsOnPasswordReset: true, // SEC-02
      password: { hash: hashPassword, verify: verifyPassword }, // Argon2id (SEC-01)
    },
    session: { expiresIn: SESSION_DAYS * DAY_SECONDS, updateAge: DAY_SECONDS }, // SEC-02, sliding
    rateLimit: {
      enabled: true,
      storage: 'database', // survives restarts and is shared between instances
      customRules: {
        '/sign-in/email': { window: SIGN_IN_WINDOW_SECONDS, max: SIGN_IN_MAX_ATTEMPTS }, // SEC-05, per IP
      },
    },
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: secureCookies },
    },
    telemetry: { enabled: false },
    plugins: [
      ...(options.checkCompromisedPasswords === false ? [] : [haveIBeenPwned()]),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

interface SessionUser {
  readonly user: { readonly id: string; readonly emailVerified: boolean };
}

/** The can() actor of an authenticated session (08_SECURITY_PRIVACY.md §4), or null when signed out. */
export function actorFromSession(current: SessionUser | null): Actor | null {
  return current === null
    ? null
    : { kind: 'user', userId: current.user.id, emailVerified: current.user.emailVerified };
}
