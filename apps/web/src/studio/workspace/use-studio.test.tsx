// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_DOCUMENT } from '../../landing/demo';
import { FakeEventSource } from '../fake-event-source';
import { holdLogo, takeLogo } from '../pending-logo';
import type { Fetcher } from '../upload';
import { useStudio } from './use-studio';

const PROJECT = '0190a0b0-0000-7000-8000-00000000000a';
const summary = {
  id: PROJECT,
  title: 'La Mèza',
  industryLabel: null,
  language: 'fr',
  briefText: null,
  status: 'ready',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A fake API: GET project answers `stored`, POST commands answers `next` (or the given failure). */
function api(options: {
  readonly load: () => Response;
  readonly command?: (body: { baseSeq: number }) => Response;
}) {
  const calls: string[] = [];
  const fetcher: Fetcher = (input, init) => {
    const url = input;
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.endsWith('/commands') && options.command !== undefined) {
      const raw = init?.body;
      const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : null;
      const baseSeq =
        typeof body === 'object' && body !== null && 'baseSeq' in body ? Number(body.baseSeq) : -1;
      return Promise.resolve(options.command({ baseSeq }));
    }
    return Promise.resolve(options.load());
  };
  return { fetcher, calls };
}

const stored = (seq: number, document = DEMO_DOCUMENT) => ({
  project: summary,
  document: { seq, body: document },
});

function setup(fetcher: Fetcher) {
  const sources: FakeEventSource[] = [];
  const hook = renderHook(() =>
    useStudio({
      projectId: PROJECT,
      fetcher,
      openEvents: (url) => {
        const source = new FakeEventSource(url);
        sources.push(source);
        return source;
      },
    }),
  );
  return { hook, source: () => sources[0] };
}

describe('studio state', () => {
  it('opens a stored guideline ready', async () => {
    const { fetcher } = api({ load: () => json(stored(3)) });
    const { hook } = setup(fetcher);
    await waitFor(() => {
      expect(hook.result.current.phase).toBe('ready');
    });
    expect(hook.result.current.revision?.seq).toBe(3);
  });

  it('treats a failed load as a failure, never as "no document", and keeps the pending logo', async () => {
    const logo = new File(['x'], 'logo.png', { type: 'image/png' });
    holdLogo(PROJECT, logo);
    const { fetcher, calls } = api({ load: () => json({ code: 'INTERNAL' }, 500) });
    const { hook } = setup(fetcher);
    await waitFor(() => {
      expect(hook.result.current.phase).toBe('failed');
    });
    expect(hook.result.current.canRetry).toBe(true);
    expect(calls.some((call) => call.includes('/assets/'))).toBe(false);
    expect(takeLogo(PROJECT)).toBe(logo);
  });

  it('never lets an older revision overwrite a newer edit (replayed analysis.done)', async () => {
    let serverSeq = 0;
    const edited = { ...DEMO_DOCUMENT, brand: { ...DEMO_DOCUMENT.brand, name: 'Édité' } };
    const { fetcher } = api({
      load: () => json(stored(0)),
      command: () => {
        serverSeq = 1;
        return json({ seq: 1, document: edited });
      },
    });
    const { hook, source } = setup(fetcher);
    await waitFor(() => {
      expect(hook.result.current.phase).toBe('ready');
    });
    await act(async () => {
      await hook.result.current.run({ type: 'SetBrandField', field: 'name', value: 'Édité' });
    });
    expect(serverSeq).toBe(1);
    // The stream replays the analysis on reconnection; the load it triggers returns the stale seq 0.
    act(() => {
      source()?.emit('analysis.done', { seq: 0 });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(hook.result.current.revision?.seq).toBe(1);
    expect(hook.result.current.shown?.brand.name).toBe('Édité');
    expect(hook.result.current.canUndo).toBe(true);
  });

  it('reloads the stored revision after a conflict, then says so', async () => {
    let loads = 0;
    const { fetcher } = api({
      load: () => {
        loads += 1;
        return json(stored(loads === 1 ? 2 : 5));
      },
      command: () => json({ code: 'REVISION_CONFLICT' }, 409),
    });
    const { hook } = setup(fetcher);
    await waitFor(() => {
      expect(hook.result.current.phase).toBe('ready');
    });
    let applied = true;
    await act(async () => {
      applied = await hook.result.current.run({
        type: 'SetBrandField',
        field: 'name',
        value: 'Autre',
      });
    });
    expect(applied).toBe(false);
    expect(hook.result.current.revision?.seq).toBe(5);
    expect(hook.result.current.failure).toMatchObject({ kind: 'http', status: 409 });
    expect(hook.result.current.shown?.brand.name).toBe(DEMO_DOCUMENT.brand.name);
    expect(hook.result.current.busy).toBe(false);
  });

  it('sends queued commands in order, each on the revision left by the previous one', async () => {
    const bases: number[] = [];
    let seq = 0;
    const { fetcher } = api({
      load: () => json(stored(0)),
      command: ({ baseSeq }) => {
        bases.push(baseSeq);
        seq += 1;
        return json({ seq, document: DEMO_DOCUMENT });
      },
    });
    const { hook } = setup(fetcher);
    await waitFor(() => {
      expect(hook.result.current.phase).toBe('ready');
    });
    await act(async () => {
      await Promise.all([
        hook.result.current.run({ type: 'SetBrandField', field: 'name', value: 'Un' }),
        hook.result.current.run({ type: 'SetBrandField', field: 'name', value: 'Deux' }),
      ]);
    });
    expect(bases).toEqual([0, 1]);
    expect(hook.result.current.busy).toBe(false);
  });
});
