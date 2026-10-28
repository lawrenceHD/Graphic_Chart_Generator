'use client';

import type { AssetErrorCode } from '@app/contracts';
import { useTranslations } from 'next-intl';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Button } from '../components/button';
import { AnalysisTimeline } from './analysis-timeline';
import { LogoDropzone } from './logo-dropzone';
import { takeLogo } from './pending-logo';
import { subscribeProjectEvents, type EventSourceLike, type StreamState } from './project-stream';
import {
  INITIAL_TIMELINE,
  assetVerdict,
  reduceTimeline,
  timelineStatus,
  type AssetVerdict,
} from './timeline';
import { startAnalysis, uploadLogo, type Fetcher, type UploadFailure } from './upload';

// Start of a project (US-02 then US-04): drop the logo, wait for the scan verdict on the SSE stream, start
// the analysis and follow it. A failed start or step keeps the logo: the retry only starts a new run
// (AC-04.3). Verdicts are kept per asset as they arrive, so one that beats the upload answer is not lost.
type Phase = 'idle' | 'sending' | 'scanning' | 'starting' | 'following';
type Failure = UploadFailure | { readonly kind: 'unexpected' };

const browserFetch: Fetcher = (input, init) => fetch(input, init);
const randomKey = (): string => crypto.randomUUID();

export function StudioStart({
  projectId,
  fetcher = browserFetch,
  openEvents,
  newKey = randomKey,
}: {
  readonly projectId: string;
  readonly fetcher?: Fetcher;
  readonly openEvents?: (url: string) => EventSourceLike;
  readonly newKey?: () => string;
}) {
  const t = useTranslations('studio');
  const tAnalysis = useTranslations('analysis');
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [rejection, setRejection] = useState<AssetErrorCode | undefined>();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [stream, setStream] = useState<StreamState>('open');
  const [timeline, dispatch] = useReducer(reduceTimeline, INITIAL_TIMELINE);
  // Synchronous state shared with the stream handler: no render sits between an event and these checks.
  const verdicts = useRef(new Map<string, AssetVerdict>());
  const awaiting = useRef<string | null>(null);
  const analyzing = useRef(false);

  const analyze = async (): Promise<void> => {
    if (analyzing.current) return;
    analyzing.current = true;
    setFailure(null);
    setCanRetry(false);
    setPhase('starting');
    try {
      const started = await startAnalysis(fetcher, projectId, newKey());
      if (started.ok) setPhase('following');
      else {
        setFailure(started.error);
        setCanRetry(true);
        setPhase('idle');
      }
    } catch {
      setFailure({ kind: 'unexpected' });
      setCanRetry(true);
      setPhase('idle');
    } finally {
      analyzing.current = false;
    }
  };

  /** Acts on the verdict of the awaited asset once both are known, whichever came first. */
  const settle = (assetId: string): void => {
    const verdict = verdicts.current.get(assetId);
    if (awaiting.current !== assetId || verdict === undefined) return;
    awaiting.current = null;
    if (verdict.status === 'clean') void analyze();
    else {
      setRejection(verdict.code);
      setPhase('idle');
    }
  };
  const latestSettle = useRef(settle);
  useEffect(() => {
    latestSettle.current = settle;
  });

  useEffect(
    () =>
      subscribeProjectEvents(
        projectId,
        {
          event: (event) => {
            dispatch(event);
            if (event.type !== 'asset.status') return;
            const verdict = assetVerdict(event, event.data.assetId);
            if (verdict === null) return;
            verdicts.current.set(event.data.assetId, verdict);
            latestSettle.current(event.data.assetId);
          },
          connection: setStream,
        },
        openEvents,
      ),
    [projectId, openEvents],
  );

  const send = async (file: File): Promise<void> => {
    setRejection(undefined);
    setFailure(null);
    setCanRetry(false);
    setFileName(file.name);
    setPhase('sending');
    try {
      const uploaded = await uploadLogo(fetcher, projectId, file);
      if (!uploaded.ok) {
        if (uploaded.error.kind === 'rejected') setRejection(uploaded.error.code);
        else setFailure(uploaded.error);
        setPhase('idle');
        return;
      }
      const { assetId, status } = uploaded.value;
      if (status === 'clean') verdicts.current.set(assetId, { status: 'clean' });
      awaiting.current = assetId;
      setPhase('scanning');
      settle(assetId);
    } catch {
      setFailure({ kind: 'unexpected' });
      setPhase('idle');
    }
  };

  const latestSend = useRef(send);
  useEffect(() => {
    latestSend.current = send;
  });
  // Logo chosen on "Démarrer": sent once the stream above is subscribed (effects run in order).
  useEffect(() => {
    const pending = takeLogo(projectId);
    if (pending !== undefined) void latestSend.current(pending);
  }, [projectId]);

  const status = timelineStatus(timeline);
  const busy =
    phase === 'sending' || phase === 'scanning' || phase === 'starting' || status === 'running';
  const progress =
    phase === 'sending'
      ? t('sending', { name: fileName })
      : phase === 'scanning'
        ? t('scanning')
        : phase === 'starting' || (phase === 'following' && status === 'idle')
          ? t('starting')
          : null;

  const failureText = (current: Failure): string => {
    if (current.kind === 'network') return t('network');
    if (current.kind === 'storage') return t('storage');
    if (current.kind === 'unexpected') return t('unexpected');
    if (current.kind === 'http' && current.status === 429) return t('rateLimited');
    if (current.kind === 'http' && (current.status === 401 || current.status === 403))
      return t('forbidden');
    return t('refused', { code: current.code });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            {t('startTitle')}
          </h1>
          <p className="m-0 text-lg text-ink-2">{t('startLead')}</p>
        </div>
        <LogoDropzone onAccept={(file) => void send(file)} rejection={rejection} disabled={busy} />
        {progress === null ? null : (
          <p role="status" className="m-0 text-sm text-ink-2">
            {progress}
          </p>
        )}
        {failure === null ? null : (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="m-0 text-sm text-danger">
              {failureText(failure)}
            </p>
            {canRetry ? <Button onClick={() => void analyze()}>{tAnalysis('retry')}</Button> : null}
          </div>
        )}
        {stream === 'reconnecting' ? (
          <p role="status" className="m-0 text-sm text-warning">
            {t('streamLost')}
          </p>
        ) : null}
        {stream === 'closed' ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {t('streamClosed')}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <AnalysisTimeline timeline={timeline} onRetry={() => void analyze()} />
        {status === 'done' ? (
          <p role="status" className="m-0 text-sm text-success">
            {tAnalysis('ready')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
