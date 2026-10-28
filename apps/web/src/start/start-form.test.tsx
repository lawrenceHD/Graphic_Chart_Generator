// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { frMessages, renderFr } from '../studio/intl-test-utils';
import { takeLogo } from '../studio/pending-logo';
import { StartForm } from './start-form';

const PROJECT = '0190a0b0-0000-7000-8000-00000000000b';
const PNG = new File(
  [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'la-meza.png',
);
const t = frMessages.start;

beforeEach(() => {
  // jsdom has no object URLs.
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:logo' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
});
afterEach(cleanup);

function setup(answers: Response[], light = false) {
  const urls: string[] = [];
  const fetcher = (url: string): Promise<Response> => {
    urls.push(url);
    return Promise.resolve(answers.shift() ?? new Response(null, { status: 500 }));
  };
  const navigate = vi.fn();
  renderFr(
    <StartForm
      getTurnstileToken={() => Promise.resolve('token')}
      navigate={navigate}
      fetcher={fetcher}
      measureTone={() => Promise.resolve(light)}
    />,
  );
  return { urls, navigate };
}

describe('StartForm ("Démarrer", US-01 then US-02)', () => {
  it('asks for the name and the logo before creating anything', async () => {
    const { urls } = setup([]);
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.needName);
    await userEvent.type(screen.getByLabelText(t.name), 'La Mèza');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.needLogo);
    expect(urls).toHaveLength(0);
  });

  it('creates the project with its brief, hands the logo over and opens the studio', async () => {
    const { urls, navigate } = setup([
      Response.json({ project: { id: PROJECT } }, { status: 201 }),
    ]);
    await userEvent.type(screen.getByLabelText(t.name), 'La Mèza');
    await userEvent.upload(screen.getByLabelText(frMessages.dropzone.choose), PNG);
    await screen.findByText(t.chosen.replace('{name}', 'la-meza.png'));
    expect(screen.getByText('La Mèza')).toBeDefined(); // the cover follows the name
    await userEvent.type(screen.getByLabelText(t.brief), 'Une table, des inconnus.');
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(`/studio/${PROJECT}`);
    });
    expect(urls).toEqual(['/api/v1/projects']);
    expect(takeLogo(PROJECT)).toBe(PNG);
  });

  it('presents a light logo on a dark cover', async () => {
    setup([], true);
    await userEvent.upload(screen.getByLabelText(frMessages.dropzone.choose), PNG);
    await waitFor(() => {
      expect(screen.getByTestId('cover-preview').dataset.tone).toBe('dark');
    });
    expect(screen.getByText(t.darkBackground)).toBeDefined();
  });

  it('explains a refusal and lets the person try again', async () => {
    const { navigate } = setup([Response.json({ code: 'RATE_LIMITED' }, { status: 429 })]);
    await userEvent.type(screen.getByLabelText(t.name), 'A');
    await userEvent.upload(screen.getByLabelText(frMessages.dropzone.choose), PNG);
    await screen.findByText(t.chosen.replace('{name}', 'la-meza.png'));
    await userEvent.click(screen.getByRole('button', { name: t.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.rateLimited);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: t.submit })).toHaveProperty('disabled', false);
  });
});
