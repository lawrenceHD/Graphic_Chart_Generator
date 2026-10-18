import { describe, expect, it } from 'vitest';
import { checkTargetedUndo, redoTarget, undoTarget, type RevisionRef } from './history.js';

const ordinary = (seq: number): RevisionRef => ({ seq, undoOf: null, redoOf: null });
const undo = (seq: number, of: number): RevisionRef => ({ seq, undoOf: of, redoOf: null });
const redo = (seq: number, of: number): RevisionRef => ({ seq, undoOf: null, redoOf: of });

describe('undo and redo targets (03_DATA_MODEL.md §5, ADR-018)', () => {
  it('two successive undos cancel two distinct revisions, never each other', () => {
    const history = [ordinary(1), ordinary(2), undo(3, 2)];
    expect(undoTarget([ordinary(1), ordinary(2)])).toBe(2);
    expect(undoTarget(history)).toBe(1);
    expect(undoTarget([...history, undo(4, 1)])).toBeUndefined();
  });

  it('redoes the latest undo first, then the previous one', () => {
    const history = [ordinary(1), ordinary(2), undo(3, 2), undo(4, 1)];
    expect(redoTarget(history)).toBe(4);
    expect(redoTarget([...history, redo(5, 4)])).toBe(3);
    expect(redoTarget([...history, redo(5, 4), redo(6, 3)])).toBeUndefined();
  });

  it('a new ordinary revision clears the redo possibility', () => {
    expect(redoTarget([ordinary(1), undo(2, 1), ordinary(3)])).toBeUndefined();
  });

  it('a redone revision can be undone again, through the redo', () => {
    const history = [ordinary(1), undo(2, 1), redo(3, 2)];
    expect(undoTarget(history)).toBe(3);
    expect(redoTarget([...history, undo(4, 3)])).toBe(4);
  });

  it('an empty history has nothing to undo or redo', () => {
    expect(undoTarget([])).toBeUndefined();
    expect(redoTarget([])).toBeUndefined();
  });

  it('checks a targeted undo (copilot button) without depending on order', () => {
    const history = [ordinary(1), ordinary(2), undo(3, 1)];
    expect(checkTargetedUndo(history, 2)).toBe('ok');
    expect(checkTargetedUndo(history, 1)).toBe('ALREADY_UNDONE');
    expect(checkTargetedUndo(history, 3)).toBe('IS_UNDO');
    expect(checkTargetedUndo(history, 9)).toBe('NOT_FOUND');
  });
});
