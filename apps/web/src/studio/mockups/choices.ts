import { MockupFinish, SurfacePaint } from '@app/contracts';
import type { SurfaceChoice, SurfaceChoices } from '@app/mockup-engine';
import { z } from 'zod';

// What the person decided on the objects of the mockup scenes, with its own undo and redo. Pure: the
// workspace holds the history, the stage reads the present, the tests read both.
const LogoChoice = z.enum(['color', 'black', 'white']);
/** A field set, or null to hand it back to the automatic art direction. */
const Patch = z.strictObject({
  paint: SurfacePaint.nullable().optional(),
  finish: MockupFinish.nullable().optional(),
  logo: LogoChoice.nullable().optional(),
});
type PatchValue = z.infer<typeof Patch>;

type Scenes = Readonly<Record<string, SurfaceChoices>>;
export interface ChoiceHistory {
  readonly present: Scenes;
  readonly past: readonly Scenes[];
  readonly future: readonly Scenes[];
}
export const emptyHistory: ChoiceHistory = { present: {}, past: [], future: [] };
const HISTORY_LIMIT = 100;

export const sceneChoices = (history: ChoiceHistory, scene: string): SurfaceChoices =>
  history.present[scene] ?? {};

function merged(current: SurfaceChoice, patch: PatchValue): SurfaceChoice {
  const paint = patch.paint === undefined ? current.paint : (patch.paint ?? undefined);
  const finish = patch.finish === undefined ? current.finish : (patch.finish ?? undefined);
  const logo = patch.logo === undefined ? current.logo : (patch.logo ?? undefined);
  return {
    ...(paint === undefined ? {} : { paint }),
    ...(finish === undefined ? {} : { finish }),
    ...(logo === undefined ? {} : { logo }),
  };
}

const same = (a: SurfaceChoice, b: SurfaceChoice): boolean =>
  a.paint === b.paint && a.finish === b.finish && a.logo === b.logo;

function commit(
  history: ChoiceHistory,
  scene: string,
  object: string,
  next: SurfaceChoice,
): ChoiceHistory {
  const before = history.present[scene] ?? {};
  if (same(before[object] ?? {}, next)) return history;
  const rest = Object.fromEntries(Object.entries(before).filter(([key]) => key !== object));
  const after: SurfaceChoices = Object.keys(next).length === 0 ? rest : { ...rest, [object]: next };
  return {
    present: { ...history.present, [scene]: after },
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    future: [],
  };
}

/** Sets or clears fields of one object. Input is unknown: it is validated here, a bad value is ignored. */
export function choose(
  history: ChoiceHistory,
  scene: string,
  object: string,
  patch: unknown,
): ChoiceHistory {
  const parsed = Patch.safeParse(patch);
  if (!parsed.success) return history;
  return commit(
    history,
    scene,
    object,
    merged(history.present[scene]?.[object] ?? {}, parsed.data),
  );
}

/** Every field of one object back to automatic, as one step. */
export const reset = (history: ChoiceHistory, scene: string, object: string): ChoiceHistory =>
  commit(history, scene, object, {});

export function undo(history: ChoiceHistory): ChoiceHistory {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return {
    present: previous,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future],
  };
}

export function redo(history: ChoiceHistory): ChoiceHistory {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { present: next, past: [...history.past, history.present], future: rest };
}
