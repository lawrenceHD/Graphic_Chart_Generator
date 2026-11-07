'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { Button } from '../components/button';
import {
  validateAuthForm,
  type AuthField,
  type AuthMode,
  type AuthValues,
  type FailureKey,
  type FieldErrorKey,
} from './auth-logic';

export type AuthSubmit = (
  mode: AuthMode,
  values: AuthValues,
) => Promise<
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure: FailureKey;
      /** Delay announced by the server after too many attempts (429). */
      readonly retryAfterSeconds?: number;
    }
>;

const INPUT =
  'min-h-11 w-full rounded-md border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-3 aria-invalid:border-danger';

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly error: string | undefined;
  readonly hint?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint !== undefined && error === undefined ? (
        <p id={`${id}-note`} className="m-0 text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
      {error === undefined ? null : (
        <p id={`${id}-note`} className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Sign-in and sign-up form. The network call is injected: validation and states are tested without it. */
export function AuthForm({
  mode,
  submit,
}: {
  readonly mode: AuthMode;
  readonly submit: AuthSubmit;
}) {
  const t = useTranslations('auth');
  const [errors, setErrors] = useState<Partial<Record<AuthField, FieldErrorKey>>>({});
  const [failure, setFailure] = useState<{ key: FailureKey; minutes: number | null } | null>(null);
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    if (errorCount > 0 || failure !== null) summary.current?.focus();
  }, [errorCount, failure]);

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string): string => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    const checked = validateAuthForm(mode, {
      name: text('name'),
      email: text('email'),
      password: text('password'),
    });
    setFailure(null);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const outcome = await submit(mode, checked.value);
      if (!outcome.ok) {
        const seconds = outcome.retryAfterSeconds;
        setFailure({
          key: outcome.failure,
          minutes: seconds === undefined ? null : Math.max(1, Math.ceil(seconds / 60)),
        });
      }
    } finally {
      setPending(false);
    }
  };

  const message = (field: AuthField): string | undefined => {
    const key = errors[field];
    return key === undefined ? undefined : t(`field.${key}`);
  };
  const describe = (field: AuthField): string | undefined =>
    errors[field] === undefined && !(field === 'password' && mode === 'signup')
      ? undefined
      : `${field}-note`;

  return (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      aria-busy={pending}
      className="flex flex-col gap-5"
    >
      <div ref={summary} tabIndex={-1} className="focus:outline-none">
        {errorCount > 0 ? (
          <p role="alert" className="m-0 text-sm font-medium text-danger">
            {t('summary', { count: errorCount })}
          </p>
        ) : null}
        {failure === null ? null : (
          <p role="alert" className="m-0 text-sm font-medium text-danger">
            {failure.key === 'rateLimited' && failure.minutes !== null
              ? t('failure.rateLimitedIn', { minutes: failure.minutes })
              : t(`failure.${failure.key}`)}
          </p>
        )}
      </div>

      {mode === 'signup' ? (
        <Field id="name" label={t('name')} error={message('name')}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name !== undefined}
            aria-describedby={describe('name')}
            className={INPUT}
          />
        </Field>
      ) : null}
      <Field id="email" label={t('email')} error={message('email')}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email !== undefined}
          aria-describedby={describe('email')}
          className={INPUT}
        />
      </Field>
      <Field
        id="password"
        label={t('password')}
        error={message('password')}
        hint={mode === 'signup' ? t('passwordHint') : undefined}
      >
        <input
          id="password"
          name="password"
          type={reveal ? 'text' : 'password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          aria-invalid={errors.password !== undefined}
          aria-describedby={describe('password')}
          className={INPUT}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={reveal}
          onChange={(event) => {
            setReveal(event.target.checked);
          }}
          className="size-4"
        />
        {t('showPassword')}
      </label>

      <Button type="submit" disabled={pending} className="w-full rounded-full">
        {pending ? t('pending') : t(`${mode}.submit`)}
      </Button>
    </form>
  );
}
