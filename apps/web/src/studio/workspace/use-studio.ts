'use client';

import type { AssetErrorCode, ProjectEvent } from '@app/contracts';
import { apply, type BrandDocument, type Command } from '@app/document';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { takeLogo } from '../pending-logo';
import { subscribeProjectEvents, type EventSourceLike, type StreamState } from '../project-stream';
import {
  INITIAL_TIMELINE,
  assetVerdict,
  reduceTimeline,
  timelineStatus,
  type AssetVerdict,
  type Timeline,
} from '../timeline';
import { startAnalysis, uploadLogo, type Fetcher, type UploadFailure } from '../upload';
import {
  loadProject,
  redoLast,
  sendCommand,
  undoLast,
  type DocumentFailure,
  type ProjectSummary,
  type Revision,
} from './document-client';

// One state for the whole studio (US-02, US-04, US-05): the logo is sent and scanned, the analysis is
// followed on the SSE stream, then the document is read and edited through commands. An edit is drawn at once
// by applying the command locally with the same apply() as the server, then confirmed by the server's answer;
// a refusal puts the server's revision back and says why.
export type Phase =
  'loading' | 'empty' | 'sending' | 'scanning' | 'starting' | 'analysing' | 'ready';

export type StudioFailure =
  | UploadFailure
  | DocumentFailure
  | { readonly kind: 'unexpected' }
  | { readonly kind: 'rejected-command'; readonly code: string };

export interface JournalEntry {
  readonly id: number;
  /** Milliseconds since the studio opened. */
  readonly at: number;
  readonly event: ProjectEvent;
}

export interface StudioState {
  readonly phase: Phase;
  readonly project: ProjectSummary | null;
  readonly revision: Revision | null;
  /** Document drawn on the canvas: the revision, or the revision plus a pending local edit. */
  readonly shown: BrandDocument | null;
  readonly timeline: Timeline;
  readonly journal: readonly JournalEntry[];
  readonly stream: StreamState;
  readonly rejection: AssetErrorCode | undefined;
  readonly failure: StudioFailure | null;
  readonly canRetry: boolean;
  readonly fileName: string;
  readonly undoable: number;
  readonly redoable: number;
  readonly busy: boolean;
}

const browserFetch: Fetcher = (input, init) => fetch(input, init);
const randomKey = (): string => crypto.randomUUID();
const clock = (): number => performance.now();

export interface StudioActions {
  readonly send: (file: File) => Promise<void>;
  readonly analyze: () => Promise<void>;
  /** Draws a command without sending it (a slider being dragged). */
  readonly preview: (command: Command) => void;
  /** Applies, sends and records a command; resolves to true once the server stored it. */
  readonly run: (command: Command) => Promise<boolean>;
  readonly undo: () => Promise<void>;
  readonly redo: () => Promise<void>;
  readonly dismiss: () => void;
}

export function useStudio({
  projectId,
  fetcher = browserFetch,
  openEvents,
  newKey = randomKey,
  now = clock,
}: {
  readonly projectId: string;
  readonly fetcher?: Fetcher;
  readonly openEvents?: (url: string) => EventSourceLike;
  readonly newKey?: () => string;
  readonly now?: () => number;
}): StudioState & StudioActions {
  const [phase, setPhase] = useState<Phase>('loading');
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [shown, setShown] = useState<BrandDocument | null>(null);
  const [timeline, dispatch] = useReducer(reduceTimeline, INITIAL_TIMELINE);
  const [journal, setJournal] = useState<readonly JournalEntry[]>([]);
  const [stream, setStream] = useState<StreamState>('open');
  const [rejection, setRejection] = useState<AssetErrorCode | undefined>();
  const [failure, setFailure] = useState<StudioFailure | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [fileName, setFileName] = useState('');
  const [undoable, setUndoable] = useState(0);
  const [redoable, setRedoable] = useState(0);
  const [busy, setBusy] = useState(false);

  // Synchronous state shared with the stream handler and the command queue.
  const verdicts = useRef(new Map<string, AssetVerdict>());
  const awaiting = useRef<string | null>(null);
  const analyzing = useRef(false);
  const current = useRef<Revision | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const opened = useRef(now());
  const counter = useRef(0);

  const adopt = useCallback((next: Revision | null) => {
    current.current = next;
    setRevision(next);
    setShown(next?.document ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const loaded = await loadProject(fetcher, projectId);
    if (!loaded.ok) {
      setFailure(loaded.error);
      return false;
    }
    setProject(loaded.value.project);
    adopt(loaded.value.revision);
    return loaded.value.revision !== null;
  }, [adopt, fetcher, projectId]);

  const analyze = useCallback(async (): Promise<void> => {
    if (analyzing.current) return;
    analyzing.current = true;
    setFailure(null);
    setCanRetry(false);
    setPhase('starting');
    try {
      const started = await startAnalysis(fetcher, projectId, newKey());
      if (started.ok) setPhase('analysing');
      else {
        setFailure(started.error);
        setCanRetry(true);
        setPhase(current.current === null ? 'empty' : 'ready');
      }
    } catch {
      setFailure({ kind: 'unexpected' });
      setCanRetry(true);
      setPhase(current.current === null ? 'empty' : 'ready');
    } finally {
      analyzing.current = false;
    }
  }, [fetcher, newKey, projectId]);

  /** Acts on the verdict of the awaited asset once both are known, whichever came first. */
  const settle = (assetId: string): void => {
    const verdict = verdicts.current.get(assetId);
    if (awaiting.current !== assetId || verdict === undefined) return;
    awaiting.current = null;
    if (verdict.status === 'clean') void analyze();
    else {
      setRejection(verdict.code);
      setPhase('empty');
    }
  };
  const latestSettle = useRef(settle);
  useEffect(() => {
    latestSettle.current = settle;
  });

  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  });

  useEffect(
    () =>
      subscribeProjectEvents(
        projectId,
        {
          event: (event) => {
            dispatch(event);
            counter.current += 1;
            const entry = { id: counter.current, at: now() - opened.current, event };
            setJournal((entries) => [...entries.slice(-80), entry]);
            if (event.type === 'analysis.done') {
              void latestRefresh.current().then((ready) => {
                if (ready) {
                  setPhase('ready');
                  setUndoable(0);
                  setRedoable(0);
                }
              });
              return;
            }
            if (event.type === 'analysis.step') {
              setPhase((value) =>
                value === 'loading' || value === 'empty' || value === 'starting'
                  ? 'analysing'
                  : value,
              );
              return;
            }
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
    [projectId, openEvents, now],
  );

  const send = useCallback(
    async (file: File): Promise<void> => {
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
          setPhase('empty');
          return;
        }
        const { assetId, status } = uploaded.value;
        if (status === 'clean') verdicts.current.set(assetId, { status: 'clean' });
        awaiting.current = assetId;
        setPhase('scanning');
        latestSettle.current(assetId);
      } catch {
        setFailure({ kind: 'unexpected' });
        setPhase('empty');
      }
    },
    [fetcher, projectId],
  );

  // First load: a project with a document opens ready; otherwise the logo chosen on "Démarrer" is sent
  // once the stream is subscribed (effects run in order), or the canvas offers the drop zone.
  const latestSend = useRef(send);
  useEffect(() => {
    latestSend.current = send;
  });
  useEffect(() => {
    let alive = true;
    void latestRefresh.current().then((ready) => {
      if (!alive) return;
      if (ready) {
        // Replayed step events may have marked the run as analysing: a stored document is ready.
        setPhase((value) => (value === 'loading' || value === 'analysing' ? 'ready' : value));
        return;
      }
      const pending = takeLogo(projectId);
      if (pending === undefined) setPhase((value) => (value === 'loading' ? 'empty' : value));
      else void latestSend.current(pending);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const preview = useCallback((command: Command) => {
    const base = current.current;
    if (base === null) return;
    const applied = apply(base.document, command);
    if (applied.ok) setShown(applied.value.doc);
  }, []);

  const enqueue = useCallback(<T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(task, task);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const run = useCallback(
    (command: Command): Promise<boolean> => {
      const base = current.current;
      if (base === null) return Promise.resolve(false);
      const applied = apply(base.document, command);
      if (!applied.ok) {
        setFailure({ kind: 'rejected-command', code: applied.error.code });
        return Promise.resolve(false);
      }
      setShown(applied.value.doc);
      setBusy(true);
      return enqueue(async () => {
        const latest = current.current;
        if (latest === null) return false;
        const answer = await sendCommand(fetcher, projectId, latest.seq, command).catch(
          (): { ok: false; error: StudioFailure } => ({ ok: false, error: { kind: 'unexpected' } }),
        );
        setBusy(false);
        if (!answer.ok) {
          setFailure(answer.error);
          setShown(current.current?.document ?? null);
          return false;
        }
        adopt(answer.value);
        setFailure(null);
        setUndoable((count) => count + 1);
        setRedoable(0);
        return true;
      });
    },
    [adopt, enqueue, fetcher, projectId],
  );

  const history = useCallback(
    (direction: 'undo' | 'redo') =>
      enqueue(async () => {
        const latest = current.current;
        if (latest === null) return;
        setBusy(true);
        const call = direction === 'undo' ? undoLast : redoLast;
        const answer = await call(fetcher, projectId, latest.seq).catch(
          (): { ok: false; error: StudioFailure } => ({ ok: false, error: { kind: 'unexpected' } }),
        );
        setBusy(false);
        if (!answer.ok) {
          setFailure(answer.error);
          return;
        }
        adopt(answer.value);
        setFailure(null);
        if (direction === 'undo') {
          setUndoable((count) => Math.max(0, count - 1));
          setRedoable((count) => count + 1);
        } else {
          setRedoable((count) => Math.max(0, count - 1));
          setUndoable((count) => count + 1);
        }
      }),
    [adopt, enqueue, fetcher, projectId],
  );

  const undo = useCallback(() => history('undo'), [history]);
  const redo = useCallback(() => history('redo'), [history]);
  const dismiss = useCallback(() => {
    setFailure(null);
  }, []);

  return {
    phase,
    project,
    revision,
    shown,
    timeline,
    journal,
    stream,
    rejection,
    failure,
    canRetry,
    fileName,
    undoable,
    redoable,
    busy,
    send,
    analyze,
    preview,
    run,
    undo,
    redo,
    dismiss,
  };
}

export { timelineStatus };
