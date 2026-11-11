// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockupObject } from './objects';
import { SceneOverlay } from './scene-overlay';

const left: MockupObject = {
  id: 'left',
  kind: 'surface',
  paints: [],
  original: true,
  finishes: ['print'],
  outline: [
    [0, 0],
    [50, 0],
    [50, 100],
    [0, 100],
  ],
};
const right: MockupObject = {
  ...left,
  id: 'right',
  outline: [
    [50, 0],
    [100, 0],
    [100, 100],
    [50, 100],
  ],
};

const hits = {
  objects: [left, right],
  hits: [
    { id: 'left', hit: (x: number) => x < 50 },
    { id: 'right', hit: (x: number) => x >= 50 },
  ],
};

function mount(selected: string | null, onSelect = vi.fn()) {
  render(
    <SceneOverlay
      sceneHits={hits}
      size={{ width: 100, height: 100 }}
      selected={selected}
      onSelect={onSelect}
      labelOf={(_kind, index) => `Objet ${String(index + 1)}`}
    />,
  );
  return onSelect;
}

afterEach(cleanup);

describe('SceneOverlay', () => {
  it('keeps a pointer selection to itself: a handler around the overlay does not run after it', () => {
    const around = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <div onPointerDown={around}>
        <SceneOverlay
          sceneHits={hits}
          size={{ width: 100, height: 100 }}
          selected={null}
          onSelect={onSelect}
          labelOf={(_kind, index) => `Objet ${String(index + 1)}`}
        />
      </div>,
    );
    const layer = container.querySelector('[role="group"]');
    if (layer === null) throw new Error('overlay not rendered');
    layer.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
    fireEvent.pointerDown(layer, { clientX: 75, clientY: 50 });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(around).not.toHaveBeenCalled();
  });

  it('gives every object an accessible button, pressed when selected', () => {
    mount('right');
    expect(screen.getByRole('button', { name: 'Objet 1' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Objet 2' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('selects an object from the keyboard', () => {
    const onSelect = mount(null);
    fireEvent.click(screen.getByRole('button', { name: 'Objet 2' }));
    expect(onSelect).toHaveBeenCalledWith('right');
  });

  it('is one tab stop, and the arrows move between objects, wrapping round', () => {
    mount(null);
    const one = screen.getByRole('button', { name: 'Objet 1' });
    const two = screen.getByRole('button', { name: 'Objet 2' });
    expect(one.tabIndex).toBe(0);
    expect(two.tabIndex).toBe(-1);
    one.focus();
    fireEvent.keyDown(one, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(two);
    expect(two.tabIndex).toBe(0);
    fireEvent.keyDown(two, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(one);
    fireEvent.keyDown(one, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(two);
    fireEvent.keyDown(two, { key: 'Home' });
    expect(document.activeElement).toBe(one);
    fireEvent.keyDown(one, { key: 'End' });
    expect(document.activeElement).toBe(two);
  });

  it('starts the tab stop on the selected object', () => {
    mount('right');
    expect(screen.getByRole('button', { name: 'Objet 2' }).tabIndex).toBe(0);
    expect(screen.getByRole('button', { name: 'Objet 1' }).tabIndex).toBe(-1);
  });

  it('clears the selection with Escape', () => {
    const onSelect = mount('left');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Objet 1' }), { key: 'Escape' });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('selects the object under the pointer, or none outside the objects', () => {
    const onSelect = mount(null);
    const layer = screen.getAllByRole('button')[0]?.parentElement;
    if (layer === null || layer === undefined) throw new Error('no layer');
    layer.getBoundingClientRect = () => new DOMRect(0, 0, 200, 200);
    fireEvent.pointerDown(layer, { clientX: 150, clientY: 20 });
    expect(onSelect).toHaveBeenLastCalledWith('right');
    fireEvent.pointerDown(layer, { clientX: 20, clientY: 20 });
    expect(onSelect).toHaveBeenLastCalledWith('left');
  });
});
