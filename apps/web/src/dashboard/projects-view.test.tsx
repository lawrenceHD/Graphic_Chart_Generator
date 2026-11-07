// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fr from '../../messages/fr.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { ProjectsView } from './projects-view';

const t = productFr.dashboard;
const project = {
  id: '3f8e1c52-6b1a-4a54-9d0e-2a7f7b0c9a11',
  title: 'Atelier Soleil',
  industryLabel: 'Boulangerie',
  language: 'fr',
  briefText: null,
  status: 'ready',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
};
const reply = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(cleanup);

function show(fetcher: () => Promise<Response>) {
  return render(
    <NextIntlClientProvider locale="fr" timeZone="UTC" messages={{ ...fr, ...productFr }}>
      <ProjectsView fetcher={fetcher} />
    </NextIntlClientProvider>,
  );
}

describe('ProjectsView', () => {
  it('shows a loading status, then each project as a link to its studio', async () => {
    show(reply(200, { items: [project], nextCursor: null }));
    expect(screen.getByRole('status').textContent).toContain(t.loading);
    const link = await screen.findByRole('link', { name: `Ouvrir ${project.title}` });
    expect(link.getAttribute('href')).toBe(`/studio/${project.id}`);
    expect(screen.getByText('Boulangerie')).toBeTruthy();
  });

  it('invites a first project when the account is empty, without invented figures', async () => {
    show(reply(200, { items: [], nextCursor: null }));
    expect(await screen.findByText(t.empty.title)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.new }).getAttribute('href')).toBe('/start');
  });

  it('sends a signed-out visitor to the sign-in page', async () => {
    show(reply(401, {}));
    const link = await screen.findByRole('link', { name: t.signedOut.cta });
    expect(link.getAttribute('href')).toBe('/connexion');
  });

  it('announces a failure and retries on demand', async () => {
    const fetcher = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [project], nextCursor: null }), { status: 200 }),
      );
    show(fetcher);
    expect((await screen.findByRole('alert')).textContent).toContain(t.error.title);
    await userEvent.click(screen.getByRole('button', { name: t.error.retry }));
    expect(await screen.findByRole('link', { name: `Ouvrir ${project.title}` })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
