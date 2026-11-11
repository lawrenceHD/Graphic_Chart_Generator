'use client';

import type { SurfaceDirection } from '@app/mockup-engine';
import { useCallback, useMemo, useState } from 'react';
import type { Directing } from '../workspace/mockup-inspector';
import {
  choose,
  emptyHistory,
  redo,
  reset,
  sceneChoices,
  undo,
  type ChoiceHistory,
} from './choices';
import type { SceneId } from './mockup-stage';

/**
 * The choices on the mockup objects with their undo/redo, and what the art direction applied (reported by
 * the stages once drawn). `directing` goes to the panel and the canvas; `onDirected` to the stages.
 */
export function useDirecting(): {
  readonly directing: Directing;
  readonly onDirected: (scene: SceneId, directions: readonly SurfaceDirection[]) => void;
} {
  const [history, setHistory] = useState<ChoiceHistory>(emptyHistory);
  const [directions, setDirections] = useState<
    Readonly<Record<string, readonly SurfaceDirection[]>>
  >({});
  const onDirected = useCallback((scene: SceneId, applied: readonly SurfaceDirection[]) => {
    // A stage reports after every draw: the same directions again must not redraw the whole canvas.
    setDirections((current) =>
      JSON.stringify(current[scene]) === JSON.stringify(applied)
        ? current
        : { ...current, [scene]: applied },
    );
  }, []);
  const onChoose = useCallback((scene: string, object: string, patch: unknown) => {
    setHistory((current) => choose(current, scene, object, patch));
  }, []);
  const onReset = useCallback((scene: string, object: string) => {
    setHistory((current) => reset(current, scene, object));
  }, []);
  const onUndo = useCallback(() => {
    setHistory(undo);
  }, []);
  const onRedo = useCallback(() => {
    setHistory(redo);
  }, []);
  const directing = useMemo<Directing>(
    () => ({
      choices: (scene) => sceneChoices(history, scene),
      directions,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      onChoose,
      onReset,
      onUndo,
      onRedo,
    }),
    [history, directions, onChoose, onReset, onUndo, onRedo],
  );
  return { directing, onDirected };
}
