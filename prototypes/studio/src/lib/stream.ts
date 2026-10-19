import { useEffect, useMemo, useRef, useState } from 'react';

// Simulated GET /projects/:id/events: the same event types and payloads as 04_API_CONTRACTS.md §5 (T-019),
// replayed on a timeline. In the product the studio subscribes to the real stream; nothing else changes.
export type StreamEvent =
  | { id: number; at: number; type: 'asset.status'; data: { status: 'quarantined' | 'clean' } }
  | {
      id: number;
      at: number;
      type: 'analysis.step';
      data: { step: 1 | 2 | 3 | 4; state: 'running' | 'done' };
    }
  | { id: number; at: number; type: 'analysis.done'; data: { seq: number } };

export const STEP_TEXT: Record<1 | 2 | 3 | 4, string> = {
  1: 'Lecture du logo et vérification du fichier…',
  2: 'Extraction de la palette et calcul des contrastes…',
  3: 'Rédaction du manifeste et choix typographique…',
  4: 'Assemblage de la charte…',
};
export const STEP_SHORT: Record<1 | 2 | 3 | 4, string> = {
  1: 'Logo',
  2: 'Palette',
  3: 'Typographie',
  4: 'Assemblage',
};

// Distributive Omit: keeps the type ↔ data link of each event.
type Scripted = StreamEvent extends infer E
  ? E extends StreamEvent
    ? Omit<E, 'id'>
    : never
  : never;
const SCRIPT: Scripted[] = [
  { at: 200, type: 'asset.status', data: { status: 'quarantined' } },
  { at: 1100, type: 'asset.status', data: { status: 'clean' } },
  { at: 1200, type: 'analysis.step', data: { step: 1, state: 'running' } },
  { at: 2600, type: 'analysis.step', data: { step: 1, state: 'done' } },
  { at: 2700, type: 'analysis.step', data: { step: 2, state: 'running' } },
  { at: 5200, type: 'analysis.step', data: { step: 2, state: 'done' } },
  { at: 5300, type: 'analysis.step', data: { step: 3, state: 'running' } },
  { at: 7600, type: 'analysis.step', data: { step: 3, state: 'done' } },
  { at: 7700, type: 'analysis.step', data: { step: 4, state: 'running' } },
  { at: 9200, type: 'analysis.step', data: { step: 4, state: 'done' } },
  { at: 9300, type: 'analysis.done', data: { seq: 1 } },
];
export const STREAM_LENGTH = 9300;

export type StepState = 'waiting' | 'running' | 'done';
export interface AnalysisState {
  events: StreamEvent[];
  asset: 'pending' | 'quarantined' | 'clean';
  steps: Record<1 | 2 | 3 | 4, StepState>;
  done: boolean;
  /** 0..1 progress inside the running step (drives the palette landing colour by colour). */
  elapsed: number;
}

/** Plays the script; `paused` freezes time, `instant` jumps to the end (reduced motion, revisit). */
export function useAnalysisStream(
  runKey: string,
  paused: boolean,
  instant: boolean,
): AnalysisState {
  const [elapsed, setElapsed] = useState(instant ? STREAM_LENGTH : 0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    setElapsed(instant ? STREAM_LENGTH : 0);
  }, [runKey, instant]);

  useEffect(() => {
    if (paused || elapsed >= STREAM_LENGTH) {
      last.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number): void => {
      const delta = last.current === null ? 0 : now - last.current;
      last.current = now;
      setElapsed((value) => Math.min(STREAM_LENGTH, value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      last.current = null;
    };
  }, [paused, elapsed >= STREAM_LENGTH]);

  return useMemo(() => {
    const events = SCRIPT.filter((event) => event.at <= elapsed).map(
      (event, index) => ({ ...event, id: index + 1 }) as StreamEvent,
    );
    const steps: AnalysisState['steps'] = {
      1: 'waiting',
      2: 'waiting',
      3: 'waiting',
      4: 'waiting',
    };
    let asset: AnalysisState['asset'] = 'pending';
    let done = false;
    for (const event of events) {
      if (event.type === 'asset.status') asset = event.data.status;
      if (event.type === 'analysis.step') steps[event.data.step] = event.data.state;
      if (event.type === 'analysis.done') done = true;
    }
    return { events, asset, steps, done, elapsed };
  }, [elapsed]);
}

/** Progress 0..1 of a step at the current time (0 before it runs, 1 once done). */
export function stepProgress(step: 1 | 2 | 3 | 4, elapsed: number): number {
  const at = (state: 'running' | 'done'): number | undefined => {
    for (const event of SCRIPT) {
      if (event.type === 'analysis.step' && event.data.step === step && event.data.state === state)
        return event.at;
    }
    return undefined;
  };
  const start = at('running');
  const end = at('done');
  if (start === undefined || end === undefined) return 0;
  return Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
}
