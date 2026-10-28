// @vitest-environment jsdom
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { FakeEventSource } from './fake-event-source';
import { frMessages, renderFr } from './intl-test-utils';
import { StudioStart } from './studio-start';

const PROJECT = '0190a0b0-0000-7000-8000-00000000000a';
const ASSET = '0190a0b0-0000-7000-8000-000000000001';
const PNG = new File(
  [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'logo.png',
);
const t = frMessages;

const asset = (status: string) => ({ id: ASSET, status, rejectReason: null });
const analysis = { analysis: { id: ASSET, status: 'pending', step: 0, errorCode: null } };

interface Call {
  readonly url: string;
  readonly method: string;
  readonly key: string | null;
}

interface Options {
  /** Runs when /complete is called, before it answers: the scan verdict may beat the answer. */
  readonly beforeComplete?: (emit: (type: string, data: unknown) => void) => void;
  /** Answers of POST /analyze, in order (202 by default). */
  readonly analyze?: Response[];
}

function harness(options: Options = {}) {
  const calls: Call[] = [];
  const analyzeAnswers = [...(options.analyze ?? [])];
  const answers: Response[] = [
    Response.json(
      {
        asset: asset('pending'),
        upload: { url: 'https://r2.example/put', method: 'PUT', headers: {} },
      },
      { status: 201 },
    ),
    new Response(null, { status: 200 }),
    Response.json({ asset: asset('quarantined') }, { status: 202 }),
  ];
  const fetcher = (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      key: new Headers(init?.headers).get('idempotency-key'),
    });
    if (url.endsWith('/complete')) options.beforeComplete?.(raw);
    if (url.endsWith('/analyze')) {
      return Promise.resolve(analyzeAnswers.shift() ?? Response.json(analysis, { status: 202 }));
    }
    return Promise.resolve(answers.shift() ?? new Response(null, { status: 500 }));
  };
  const sources: FakeEventSource[] = [];
  const raw = (type: string, data: unknown) => {
    for (const source of sources) source.emit(type, data);
  };
  const open = (url: string) => {
    const source = new FakeEventSource(url);
    sources.push(source);
    return source;
  };
  let keys = 0;
  renderFr(
    <StudioStart
      projectId={PROJECT}
      fetcher={fetcher}
      openEvents={open}
      newKey={() => `key-${String(++keys)}`}
    />,
  );
  const emit = (type: string, data: unknown) => {
    act(() => {
      raw(type, data);
    });
  };
  return { calls, emit, sources };
}

const analyzeCalls = (calls: readonly Call[]) =>
  calls.filter((call) => call.url === `/api/v1/projects/${PROJECT}/analyze`);

afterEach(cleanup);

describe('StudioStart (US-02 then US-04)', () => {
  it('uploads the logo, waits for the scan, starts the analysis and follows it', async () => {
    const { calls, emit } = harness();
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    expect(analyzeCalls(calls)).toHaveLength(0);

    emit('asset.status', { assetId: ASSET, status: 'clean' });
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(1);
    });
    expect(analyzeCalls(calls)[0]).toMatchObject({ method: 'POST', key: 'key-1' });

    emit('analysis.step', { step: 2, state: 'running' });
    expect(screen.getByTestId('analysis-live').textContent).toBe(t.analysis.steps.palette);
    emit('analysis.done', { seq: 4 });
    expect(screen.getByText(t.analysis.ready)).toBeDefined();
  });

  it('shows the scan rejection on the dropzone and starts nothing', async () => {
    const { calls, emit } = harness();
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    emit('asset.status', {
      assetId: ASSET,
      status: 'rejected',
      rejectReason: 'ASSET_SVG_TOO_COMPLEX',
    });
    expect(screen.getByRole('alert').textContent).toContain(
      t.dropzone.errors.ASSET_SVG_TOO_COMPLEX,
    );
    expect(analyzeCalls(calls)).toHaveLength(0);
  });

  it('retries a failed analysis with a new key, without sending the logo again', async () => {
    const { calls, emit } = harness();
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    emit('asset.status', { assetId: ASSET, status: 'clean' });
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(1);
    });

    emit('analysis.step', { step: 2, state: 'failed', code: 'ANALYSIS_TIMEOUT' });
    await userEvent.click(screen.getByRole('button', { name: t.analysis.retry }));
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(2);
    });
    expect(analyzeCalls(calls)[1]?.key).toBe('key-2');
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  });

  it('keeps a scan verdict that arrives before the upload is confirmed', async () => {
    const { calls } = harness({
      beforeComplete: (emit) => {
        emit('asset.status', { assetId: ASSET, status: 'clean' });
      },
    });
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(1);
    });
  });

  it('starts a single analysis when the verdict is delivered twice', async () => {
    const { calls, emit } = harness();
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    emit('asset.status', { assetId: ASSET, status: 'clean' });
    emit('asset.status', { assetId: ASSET, status: 'clean' });
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(analyzeCalls(calls)).toHaveLength(1);
  });

  it('offers a retry with the same logo when starting the analysis is refused', async () => {
    const tooMany = Response.json({ code: 'RATE_LIMITED' }, { status: 429 });
    const { calls, emit } = harness({ analyze: [tooMany] });
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    emit('asset.status', { assetId: ASSET, status: 'clean' });
    expect((await screen.findByRole('alert')).textContent).toBe(t.studio.rateLimited);
    await userEvent.click(screen.getByRole('button', { name: t.analysis.retry }));
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(2);
    });
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
  });

  it('lets the user drop another logo once the analysis failed', async () => {
    const { calls, emit } = harness();
    await userEvent.upload(screen.getByLabelText(t.dropzone.choose), PNG);
    await waitFor(() => {
      expect(calls).toHaveLength(3);
    });
    emit('asset.status', { assetId: ASSET, status: 'clean' });
    await waitFor(() => {
      expect(analyzeCalls(calls)).toHaveLength(1);
    });
    const choose = screen.getByRole('button', { name: t.dropzone.choose });
    emit('analysis.step', { step: 1, state: 'running' });
    expect(choose.hasAttribute('disabled')).toBe(true);
    emit('analysis.step', { step: 1, state: 'failed', code: 'LOGO_UNREADABLE' });
    expect(choose.hasAttribute('disabled')).toBe(false);
  });

  it('says so when the live stream is closed for good', () => {
    const { sources } = harness();
    act(() => {
      for (const source of sources) {
        source.readyState = 2;
        source.emit('error', null);
      }
    });
    expect(screen.getByRole('alert').textContent).toBe(t.studio.streamClosed);
  });
});
