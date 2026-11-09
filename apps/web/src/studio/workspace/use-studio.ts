'use client';

import type { ProjectEvent } from '@app/contracts';
import { apply, type BrandDocument, type Command } from '@app/document';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { BrandInputs } from '../brand-inputs-model';
import { takeInputs } from '../pending-logo';
import { subscribeProjectEvents, type EventSourceLike, type StreamState } from '../project-stream';
import {
  INITIAL_TIMELINE,
  assetVerdict,
  reduceTimeline,
  timelineStatus,
  type AssetVerdict,
  type Timeline,
} from '../timeline';
import { startAnalysis, type Fetcher, type UploadFailure } from '../upload';
import {
  settleBatch,
  uploadBatch,
  type BatchUpload,
  type Notice,
  type SentFile,
} from '../upload-batch';
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
// followed on the SSE stream, then the document is read and edited through commands.
// - An edit is drawn at once: the canvas shows the server's revision with every command still in flight
//   replayed on top, with the same apply() as the server. A refused command leaves the others in place.
// - Revisions only move forward: an answer older than the one held (a replayed analysis.done, a late load)
//   is ignored, so it can never overwrite a newer edit.
// - A revision conflict (409) reloads the stored document before saying so.
export type Phase =
  'loading' | 'failed' | 'empty' | 'sending' | 'scanning' | 'starting' | 'analysing' | 'ready';

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
  /** Document drawn on the canvas: the revision, plus the commands in flight and the slider preview. */
  readonly shown: BrandDocument | null;
  readonly timeline: Timeline;
  readonly journal: readonly JournalEntry[];
  readonly stream: StreamState;
  /** Files the server refused (name and reason). */
  readonly notices: readonly Notice[];
  /** Some files were refused but the analysis goes on with the others. */
  readonly partial: boolean;
  readonly failure: StudioFailure | null;
  readonly canRetry: boolean;
  readonly fileName: string;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly busy: boolean;
}

export interface StudioActions {
  /** Sends the logos (primary first) and the optional document, then starts the analysis. */
  readonly send: (inputs: BrandInputs) => Promise<void>;
  readonly analyze: () => Promise<void>;
  /** Retries the first load after a failure. */
  readonly reload: () => Promise<void>;
  /** Draws a command without sending it (a slider being dragged); null drops the preview. */
  readonly preview: (command: Command | null) => void;
  /** Applies, sends and records a command; resolves to true once the server stored it. */
  readonly run: (command: Command) => Promise<boolean>;
  readonly undo: () => Promise<void>;
  readonly redo: () => Promise<void>;
  readonly dismiss: () => void;
}

const browserFetch: Fetcher = (input, init) => fetch(input, init);
const randomKey = (): string => crypto.randomUUID();
const clock = (): number => performance.now();
const UNEXPECTED: StudioFailure = { kind: 'unexpected' };

type Loaded = 'ready' | 'empty' | 'failed';

/** The revision plus commands, applied in order; a command that no longer applies is skipped. */
function replay(base: BrandDocument, commands: readonly Command[]): BrandDocument {
  let document = base;
  for (const command of commands) {
    const applied = apply(document, command);
    if (applied.ok) document = applied.value.doc;
  }
  return document;
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
  const [notices, setNotices] = useState<readonly Notice[]>([]);
  const [partial, setPartial] = useState(false);
  const [failure, setFailure] = useState<StudioFailure | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [fileName, setFileName] = useState('');
  const [undoable, setUndoable] = useState(0);
  const [redoable, setRedoable] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  // Synchronous state shared with the stream handler and the command queue.
  const verdicts = useRef(new Map<string, AssetVerdict>());
  const batch = useRef<readonly SentFile[]>([]);
  const refusedAtUpload = useRef<readonly Notice[]>([]);
  const sentFiles = useRef(new Set<File>());
  const cleanLogos = useRef(0);
  const uploading = useRef(false);
  const analyzing = useRef(false);
  const current = useRef<Revision | null>(null);
  const inFlight = useRef<Command[]>([]);
  const previewed = useRef<Command | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latestNow = useRef(now);
  const latestOpen = useRef(openEvents);
  const opened = useRef(now());
  const counter = useRef(0);

  useEffect(() => {
    latestNow.current = now;
    latestOpen.current = openEvents;
  });

  const redraw = useCallback(() => {
    const base = current.current;
    if (base === null) {
      setShown(null);
      return;
    }
    const commands =
      previewed.current === null ? inFlight.current : [...inFlight.current, previewed.current];
    setShown(commands.length === 0 ? base.document : replay(base.document, commands));
  }, []);

  /** Takes a revision only if it is newer than the one held (or `force` for the answer of our own command). */
  const adopt = useCallback(
    (next: Revision | null, force = false): boolean => {
      const held = current.current;
      if (!force && held !== null && (next === null || next.seq <= held.seq)) return false;
      current.current = next;
      setRevision(next);
      redraw();
      return true;
    },
    [redraw],
  );

  const refresh = useCallback(async (): Promise<Loaded> => {
    try {
      const loaded = await loadProject(fetcher, projectId);
      if (!loaded.ok) {
        setFailure(loaded.error);
        return 'failed';
      }
      setProject(loaded.value.project);
      adopt(loaded.value.revision);
      return current.current === null ? 'empty' : 'ready';
    } catch {
      setFailure(UNEXPECTED);
      return 'failed';
    }
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
      setFailure(UNEXPECTED);
      setCanRetry(true);
      setPhase(current.current === null ? 'empty' : 'ready');
    } finally {
      analyzing.current = false;
    }
  }, [fetcher, newKey, projectId]);

  /**
   * Acts once every file of the batch is sent and has its verdict, whichever came first (the verdict or the
   * upload answer). Refused files are listed; the analysis goes on while one logo is clean.
   */
  const settle = (): void => {
    if (uploading.current || batch.current.length === 0) return;
    const settled = settleBatch(
      batch.current,
      verdicts.current,
      refusedAtUpload.current,
      cleanLogos.current,
    );
    if (settled === null) return;
    batch.current = [];
    refusedAtUpload.current = [];
    cleanLogos.current = settled.cleanLogos;
    setNotices(settled.refused);
    setPartial(settled.cleanLogos > 0 && settled.refused.length > 0);
    if (settled.cleanLogos > 0) void analyze();
    else setPhase('empty');
  };
  const latestSettle = useRef(settle);
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestSettle.current = settle;
    latestRefresh.current = refresh;
  });

  const onAnalysisDone = useCallback(() => {
    void latestRefresh.current().then((loaded) => {
      if (loaded === 'ready') setPhase('ready');
      else if (loaded === 'failed') {
        setCanRetry(true);
        setPhase((value) => (value === 'analysing' ? 'failed' : value));
      }
    });
  }, []);

  useEffect(
    () =>
      subscribeProjectEvents(
        projectId,
        {
          event: (event) => {
            dispatch(event);
            counter.current += 1;
            const entry = {
              id: counter.current,
              at: latestNow.current() - opened.current,
              event,
            };
            setJournal((entries) => [...entries.slice(-80), entry]);
            if (event.type === 'analysis.done') {
              onAnalysisDone();
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
            latestSettle.current();
          },
          connection: setStream,
        },
        latestOpen.current,
      ),
    [projectId, onAnalysisDone],
  );

  const send = useCallback(
    async (inputs: BrandInputs): Promise<void> => {
      if (uploading.current) return;
      uploading.current = true;
      setNotices([]);
      setPartial(false);
      setFailure(null);
      setCanRetry(false);
      setPhase('sending');
      try {
        const into: BatchUpload = { accepted: [], refused: [] };
        const uploaded = await uploadBatch(
          fetcher,
          projectId,
          inputs,
          sentFiles.current,
          setFileName,
          into,
        );
        // What was accepted before a failure still gets its verdict (the retry skips those files).
        batch.current = [...batch.current, ...into.accepted];
        refusedAtUpload.current = [...refusedAtUpload.current, ...into.refused];
        if (!uploaded.ok) {
          setFailure(uploaded.error);
          setPhase('empty');
          return;
        }
        setPhase('scanning');
      } catch {
        setFailure(UNEXPECTED);
        setPhase('empty');
        return;
      } finally {
        uploading.current = false;
      }
      if (batch.current.length > 0) {
        latestSettle.current();
        return;
      }
      // Nothing new to scan (every file was refused, or already accepted by an earlier try).
      const refused = refusedAtUpload.current;
      refusedAtUpload.current = [];
      setNotices(refused);
      setPartial(cleanLogos.current > 0 && refused.length > 0);
      if (cleanLogos.current > 0) void analyze();
      else setPhase('empty');
    },
    [analyze, fetcher, projectId],
  );

  // First load: a project with a document opens ready; a project without one sends the logo chosen on
  // "Démarrer" (effects run in order: the stream is already subscribed), or offers the drop zone. A failed
  // load never counts as "no document": it says so and offers to retry.
  const latestSend = useRef(send);
  useEffect(() => {
    latestSend.current = send;
  });
  const firstLoad = useCallback(
    async (isAlive: () => boolean): Promise<void> => {
      const loaded = await latestRefresh.current();
      if (!isAlive()) return;
      if (loaded === 'failed') {
        setCanRetry(true);
        setPhase((value) => (value === 'loading' ? 'failed' : value));
        return;
      }
      if (loaded === 'ready') {
        // Replayed step events may have marked the run as analysing: a stored document is ready.
        setPhase((value) => (value === 'loading' || value === 'analysing' ? 'ready' : value));
        return;
      }
      const pending = takeInputs(projectId);
      if (pending === undefined) setPhase((value) => (value === 'loading' ? 'empty' : value));
      else await latestSend.current(pending);
    },
    [projectId],
  );

  useEffect(() => {
    let alive = true;
    void firstLoad(() => alive);
    return () => {
      alive = false;
    };
  }, [firstLoad]);

  const reload = useCallback(async (): Promise<void> => {
    setFailure(null);
    setCanRetry(false);
    setPhase('loading');
    await firstLoad(() => true);
  }, [firstLoad]);

  const preview = useCallback(
    (command: Command | null) => {
      previewed.current = command;
      redraw();
    },
    [redraw],
  );

  /** Serial queue: every task runs after the previous one settled, and busy counts what is left. */
  const enqueue = useCallback(<T>(task: () => Promise<T>, fallback: T): Promise<T> => {
    setPendingCount((count) => count + 1);
    const guarded = async (): Promise<T> => {
      try {
        return await task();
      } catch {
        setFailure(UNEXPECTED);
        return fallback;
      } finally {
        setPendingCount((count) => count - 1);
      }
    };
    const next = queue.current.then(guarded, guarded);
    queue.current = next;
    return next;
  }, []);

  /** After a 409 the held revision is stale: take the stored one before saying it changed. */
  const recover = useCallback(
    async (problem: StudioFailure): Promise<void> => {
      if (problem.kind === 'http' && problem.status === 409) {
        const loaded = await loadProject(fetcher, projectId);
        if (loaded.ok && loaded.value.revision !== null) adopt(loaded.value.revision, true);
      }
      setFailure(problem);
    },
    [adopt, fetcher, projectId],
  );

  const run = useCallback(
    (command: Command): Promise<boolean> => {
      const base = current.current;
      if (base === null) return Promise.resolve(false);
      const applied = apply(replay(base.document, inFlight.current), command);
      if (!applied.ok) {
        setFailure({ kind: 'rejected-command', code: applied.error.code });
        return Promise.resolve(false);
      }
      previewed.current = null;
      inFlight.current = [...inFlight.current, command];
      redraw();
      const done = (): void => {
        inFlight.current = inFlight.current.filter((entry) => entry !== command);
      };
      return enqueue(async () => {
        const latest = current.current;
        if (latest === null) {
          done();
          redraw();
          return false;
        }
        const answer = await sendCommand(fetcher, projectId, latest.seq, command);
        done();
        if (!answer.ok) {
          redraw();
          await recover(answer.error);
          return false;
        }
        adopt(answer.value, true);
        setFailure(null);
        setUndoable((count) => count + 1);
        setRedoable(0);
        setExhausted(false);
        return true;
      }, false).finally(() => {
        if (inFlight.current.includes(command)) {
          done();
          redraw();
        }
      });
    },
    [adopt, enqueue, fetcher, projectId, recover, redraw],
  );

  const history = useCallback(
    (direction: 'undo' | 'redo') =>
      enqueue(async () => {
        const latest = current.current;
        if (latest === null) return;
        const call = direction === 'undo' ? undoLast : redoLast;
        const answer = await call(fetcher, projectId, latest.seq);
        if (!answer.ok) {
          // Nothing left on the server's side: the button simply stops offering it.
          if (answer.error.kind === 'http' && /^NOTHING_TO_(UNDO|REDO)$/u.test(answer.error.code)) {
            if (direction === 'undo') {
              setUndoable(0);
              setExhausted(true);
            } else setRedoable(0);
            return;
          }
          await recover(answer.error);
          return;
        }
        adopt(answer.value, true);
        setFailure(null);
        if (direction === 'undo') {
          setUndoable((count) => Math.max(0, count - 1));
          setRedoable((count) => count + 1);
        } else {
          setRedoable((count) => Math.max(0, count - 1));
          setUndoable((count) => count + 1);
        }
      }, undefined),
    [adopt, enqueue, fetcher, projectId, recover],
  );

  const undo = useCallback(() => history('undo'), [history]);
  const redo = useCallback(() => history('redo'), [history]);
  const dismiss = useCallback(() => {
    setFailure(null);
  }, []);

  // Undo stays offered for a stored guideline edited before this visit (seq above the analysis): the server
  // answers NOTHING_TO_UNDO when its history is empty, and the button then stops offering it.
  const seq = revision?.seq ?? 0;
  const busy = pendingCount > 0;
  return {
    phase,
    project,
    revision,
    shown,
    timeline,
    journal,
    stream,
    notices,
    partial,
    failure,
    canRetry,
    fileName,
    canUndo: phase === 'ready' && (undoable > 0 || (seq > 0 && !exhausted)),
    canRedo: phase === 'ready' && redoable > 0,
    busy,
    send,
    analyze,
    reload,
    preview,
    run,
    undo,
    redo,
    dismiss,
  };
}

export { timelineStatus };
