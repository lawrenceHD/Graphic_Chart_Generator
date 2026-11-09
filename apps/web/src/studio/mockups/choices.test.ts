import { describe, expect, it } from 'vitest';
import { choose, emptyHistory, redo, reset, sceneChoices, undo } from './choices';

describe('the choices of the person on a scene', () => {
  it('starts empty, so every object stays automatic', () => {
    expect(sceneChoices(emptyHistory, 'mug-white')).toEqual({});
  });

  it('remembers a choice per object and per scene', () => {
    const one = choose(emptyHistory, 'mug-white', 'mug', { finish: 'emboss' });
    const two = choose(one, 'mug-white', 'mug', { paint: 'primary' });
    expect(sceneChoices(two, 'mug-white')).toEqual({ mug: { finish: 'emboss', paint: 'primary' } });
    expect(sceneChoices(two, 'a4-sheet')).toEqual({});
  });

  it('goes back to automatic when a field is cleared, and forgets an empty object', () => {
    const set = choose(emptyHistory, 's', 'o', { logo: 'white' });
    const cleared = choose(set, 's', 'o', { logo: null });
    expect(sceneChoices(cleared, 's')).toEqual({});
  });

  it('undoes and redoes, one choice at a time', () => {
    const one = choose(emptyHistory, 's', 'o', { logo: 'white' });
    const two = choose(one, 's', 'o', { logo: 'black' });
    expect(sceneChoices(undo(two), 's')).toEqual({ o: { logo: 'white' } });
    expect(sceneChoices(undo(undo(two)), 's')).toEqual({});
    expect(sceneChoices(redo(undo(two)), 's')).toEqual({ o: { logo: 'black' } });
  });

  it('drops the redo line when a new choice is made after an undo', () => {
    const one = choose(emptyHistory, 's', 'o', { logo: 'white' });
    const back = undo(one);
    const other = choose(back, 's', 'o', { logo: 'black' });
    expect(redo(other)).toBe(other);
  });

  it('does not record a choice that changes nothing', () => {
    const one = choose(emptyHistory, 's', 'o', { logo: 'white' });
    expect(choose(one, 's', 'o', { logo: 'white' })).toBe(one);
    expect(undo(emptyHistory)).toBe(emptyHistory);
  });

  it('refuses a value that is not a palette role, a finish or a logo version', () => {
    expect(choose(emptyHistory, 's', 'o', { paint: 'hotpink' })).toBe(emptyHistory);
    expect(choose(emptyHistory, 's', 'o', { logo: 'rainbow' })).toBe(emptyHistory);
    expect(choose(emptyHistory, 's', 'o', 'nope')).toBe(emptyHistory);
  });

  it('resets one object as a single undoable step', () => {
    const one = choose(emptyHistory, 's', 'o', { logo: 'white', finish: 'foil' });
    const cleared = reset(one, 's', 'o');
    expect(sceneChoices(cleared, 's')).toEqual({});
    expect(sceneChoices(undo(cleared), 's')).toEqual({ o: { logo: 'white', finish: 'foil' } });
  });
});
