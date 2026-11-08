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
const right: MockupObject = { ...left, id: 'right', outline: [[50, 0], [100, 0], [100, 100], [50, 100]] };

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
