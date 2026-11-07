// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fr from '../../messages/fr.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { AuthForm, type AuthSubmit } from './auth-form';

const messages = { ...fr, ...productFr };
const t = productFr.auth;

afterEach(cleanup);

function setup(mode: 'login' | 'signup', submit: AuthSubmit) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AuthForm mode={mode} submit={submit} />
    </NextIntlClientProvider>,
  );
}

describe('AuthForm', () => {
  it('blocks an empty sign-up, names each problem and does not call the server', async () => {
    const submit = vi.fn<AuthSubmit>();
    setup('signup', submit);
    await userEvent.click(screen.getByRole('button', { name: t.signup.submit }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('3 champs sont à corriger');
    expect(screen.getByLabelText(t.name).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(t.field.nameRequired)).toBeTruthy();
    expect(screen.getByText(t.field.emailInvalid)).toBeTruthy();
    expect(screen.getByText(t.field.passwordShort)).toBeTruthy();
  });

  it('submits trimmed values once the fields are valid', async () => {
    const submit = vi.fn<AuthSubmit>(() => Promise.resolve({ ok: true }));
    setup('signup', submit);
    await userEvent.type(screen.getByLabelText(t.name), ' Awa ');
    await userEvent.type(screen.getByLabelText(t.email), 'awa@example.com');
    await userEvent.type(screen.getByLabelText(t.password), 'une phrase de passe');
    await userEvent.click(screen.getByRole('button', { name: t.signup.submit }));
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith('signup', {
        name: 'Awa',
        email: 'awa@example.com',
        password: 'une phrase de passe',
      });
    });
  });

  it('shows an actionable message when the server refuses', async () => {
    const submit = vi.fn<AuthSubmit>(() =>
      Promise.resolve({ ok: false, failure: 'invalidCredentials' }),
    );
    setup('login', submit);
    await userEvent.type(screen.getByLabelText(t.email), 'awa@example.com');
    await userEvent.type(screen.getByLabelText(t.password), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: t.login.submit }));
    expect(await screen.findByText(t.failure.invalidCredentials)).toBeTruthy();
    expect(screen.queryByLabelText(t.name)).toBeNull();
  });

  it('tells a full account that its trial project is safe, with a link to free a place', async () => {
    const submit = vi.fn<AuthSubmit>(() => Promise.resolve({ ok: true, claim: 'quota' }));
    setup('login', submit);
    await userEvent.type(screen.getByLabelText(t.email), 'awa@example.com');
    await userEvent.type(screen.getByLabelText(t.password), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: t.login.submit }));
    const notice = await screen.findByTestId('claim-issue');
    expect(notice.textContent).toContain('reste intact');
    expect(screen.getByRole('link', { name: t.claim.link }).getAttribute('href')).toBe('/projets');
  });

  it('disables the button while the request runs', async () => {
    let release: (value: { ok: true }) => void = () => undefined;
    const submit = vi.fn<AuthSubmit>(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    setup('login', submit);
    await userEvent.type(screen.getByLabelText(t.email), 'awa@example.com');
    await userEvent.type(screen.getByLabelText(t.password), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: t.login.submit }));
    const busy = await screen.findByRole('button', { name: t.pending });
    expect(busy).toHaveProperty('disabled', true);
    release({ ok: true });
  });
});
