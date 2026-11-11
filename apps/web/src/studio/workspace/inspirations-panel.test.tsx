// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { frMessages, renderFr } from '../intl-test-utils';
import { InspirationsPanel } from './inspirations-panel';

const t = frMessages.workspace.inspirations;
const PROJECT = '01a1cc14-2aaa-7017-9006-331f97d9b4a6';
const entry = (id: string, kind: 'mockup' | 'usage', extra: Record<string, unknown> = {}) => ({
  id,
  kind,
  title: `Titre ${id}`,
  thumbnail: `https://images.are.na/${id}`,
  link: `https://dribbble.com/shots/${id}`,
  author: 'Ada Lovelace',
  via: `https://www.are.na/block/${id}`,
  query: 'menu design',
  ...extra,
});
const answer = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(cleanup);

describe('InspirationsPanel (external inspirations, never part of the guideline)', () => {
  it('searches only when asked, then shows mockups and logo usage apart, each from its source', async () => {
    const fetcher = vi.fn(() =>
      answer({ items: [entry('1', 'mockup'), entry('2', 'usage'), entry('3', 'mockup')] }),
    );
    renderFr(<InspirationsPanel projectId={PROJECT} fetcher={fetcher} />);
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText(t.notice)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: t.search }));
    expect(fetcher).toHaveBeenCalledWith(
      `/api/v1/projects/${PROJECT}/inspirations`,
      expect.objectContaining({ credentials: 'same-origin' }),
    );
    const mockups = await screen.findByRole('list', { name: t.mockups });
    expect(within(mockups).getAllByRole('listitem')).toHaveLength(2);
    const usage = screen.getByRole('list', { name: t.usage });
    const link = within(usage).getByRole('link', { name: /Titre 2/u });
    expect(link.getAttribute('href')).toBe('https://dribbble.com/shots/2');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(within(usage).getByText(/Ada Lovelace/u)).toBeDefined();
    const image = within(usage).getByRole('img');
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(image.getAttribute('loading')).toBe('lazy');
  });

  it('says when the source is unavailable and lets the person try again', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => answer({ code: 'INSPIRATION_UNAVAILABLE' }, 503))
      .mockImplementationOnce(() => answer({ items: [entry('9', 'mockup')] }));
    renderFr(<InspirationsPanel projectId={PROJECT} fetcher={fetcher} />);
    await userEvent.click(screen.getByRole('button', { name: t.search }));
    expect((await screen.findByRole('alert')).textContent).toContain(t.unavailable);
    await userEvent.click(screen.getByRole('button', { name: t.retry }));
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });

  it('refuses an answer it cannot trust: no link that is not a web page, no image from elsewhere', async () => {
    const fetcher = vi.fn(() =>
      answer({
        items: [
          entry('1', 'mockup', { link: 'javascript:alert(1)' }),
          entry('2', 'mockup', { thumbnail: 'https://evil.example/x.png' }),
        ],
      }),
    );
    renderFr(<InspirationsPanel projectId={PROJECT} fetcher={fetcher} />);
    await userEvent.click(screen.getByRole('button', { name: t.search }));
    expect(await screen.findByText(t.empty)).toBeDefined();
    expect(screen.queryByRole('link', { name: /Titre/u })).toBeNull();
  });
});
