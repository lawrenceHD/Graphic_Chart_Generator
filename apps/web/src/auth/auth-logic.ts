import { z } from 'zod';

export type AuthMode = 'login' | 'signup';
export type AuthField = 'name' | 'email' | 'password';
export type FieldErrorKey =
  'nameRequired' | 'emailInvalid' | 'passwordRequired' | 'passwordShort' | 'passwordLong';
export type FailureKey =
  | 'invalidCredentials'
  | 'signupFailed'
  | 'passwordCompromised'
  | 'rateLimited'
  | 'generic'
  | 'network';

export interface AuthValues {
  readonly name?: string;
  readonly email: string;
  readonly password: string;
}
export type AuthValidation =
  | { readonly ok: true; readonly value: AuthValues }
  | { readonly ok: false; readonly errors: Partial<Record<AuthField, FieldErrorKey>> };

// Same bounds as Better Auth on the server (server/auth.ts, SEC-01): refusing here saves a round trip.
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const NAME_MAX = 120;
const EMAIL_MAX = 254;

const email = z.string().trim().max(EMAIL_MAX, 'emailInvalid').pipe(z.email('emailInvalid'));
const name = z.string().trim().min(1, 'nameRequired').max(NAME_MAX, 'nameRequired');

const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'passwordRequired').max(PASSWORD_MAX, 'passwordLong'),
});
const SignupSchema = z.object({
  name,
  email,
  password: z.string().min(PASSWORD_MIN, 'passwordShort').max(PASSWORD_MAX, 'passwordLong'),
});

const FIELDS: readonly AuthField[] = ['name', 'email', 'password'];
const KEYS: readonly FieldErrorKey[] = [
  'nameRequired',
  'emailInvalid',
  'passwordRequired',
  'passwordShort',
  'passwordLong',
];

const isField = (value: unknown): value is AuthField =>
  FIELDS.some((candidate) => candidate === value);
const isKey = (value: string): value is FieldErrorKey =>
  KEYS.some((candidate) => candidate === value);

export function validateAuthForm(
  mode: AuthMode,
  raw: Readonly<Record<string, string>>,
): AuthValidation {
  const parsed = (mode === 'signup' ? SignupSchema : LoginSchema).safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Partial<Record<AuthField, FieldErrorKey>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (isField(field) && errors[field] === undefined && isKey(issue.message)) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}

/** A library refusal (null when the request itself failed) as the message key shown to the user. */
export function failureKey(
  error: { readonly status?: number | undefined; readonly code?: string | undefined } | null,
): FailureKey {
  if (error === null) return 'network';
  if (error.code === 'PASSWORD_COMPROMISED') return 'passwordCompromised';
  if (error.status === 401 || error.code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'invalidCredentials';
  }
  if (error.status === 429) return 'rateLimited';
  return 'generic';
}
