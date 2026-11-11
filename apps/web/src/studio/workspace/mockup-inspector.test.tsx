// @vitest-environment jsdom
import type { SurfaceDirection } from '@app/mockup-engine';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { frMessages, renderFr } from '../intl-test-utils';
import type { MockupObject } from '../mockups/objects';
import { rememberObjects } from '../mockups/scene-hits';
import { MockupObjectPanel, type Directing } from './mockup-inspector';

const card: MockupObject = {
  id: 'card',
  kind: 'surface',
  number: 1,
  paints: ['primary', 'accent', 'neutralLight', 'neutralDark'],
  original: true,
  finishes: ['print', 'foil', 'emboss'],
  outline: null,
};
const direction: SurfaceDirection = {
  surfaceId: 'card',
  paint: '#112233',
  background: '#112233',
  finish: 'print',
  logo: 'white',
};
const colors = {
  primary: '#112233',
  accent: '#CC8800',
  neutralLight: '#F5F0EA',
  neutralDark: '#1A1A1A',
};

function directing(patch: Partial<Directing> = {}): Directing {
  return {
    choices: () => ({}),
    directions: { 'mug-white': [direction] },
    canUndo: false,
    canRedo: false,
    onChoose: vi.fn(),
    onReset: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...patch,
  };
}

function show(d: Directing, objectId: string | null = 'card') {
  rememberObjects('mug-white', [card]);
  renderFr(
    <MockupObjectPanel
      scene="mug-white"
      objectId={objectId ?? undefined}
      brand="La Meza"
      colors={colors}
      logos={['color', 'black', 'white']}
      directing={d}
    />,
  );
}

afterEach(cleanup);

describe('MockupObjectPanel', () => {
  it('asks for an object when none is selected', () => {
    show(directing(), null);
    expect(screen.getByText(frMessages.workspace.mockup.pickHint)).toBeTruthy();
  });

  it('offers the logo version, the finish and the colour as three radio groups', () => {
    show(directing());
    const logo = screen.getByRole('radiogroup', { name: 'Logo' });
    expect(
      within(logo)
        .getAllByRole('radio')
        .map((r) => r.closest('label')?.textContent),
    ).toEqual(['Auto (Blanc)', 'Couleur', 'Noir', 'Blanc']);
    expect(screen.getByRole('radiogroup', { name: 'Finition' })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Couleur du support' })).toBeTruthy();
  });

  it('marks automatic as chosen until the person picks, and says what automatic gave', () => {
    show(directing());
    const auto = within(screen.getByRole('radiogroup', { name: 'Logo' })).getByRole('radio', {
      name: /Auto/u,
    });
    expect(auto).toHaveProperty('checked', true);
    expect(auto.closest('label')?.textContent).toContain('Blanc');
  });

  it('reports a choice as one patch for this scene and object', () => {
    const d = directing({ choices: () => ({ card: { finish: 'foil' } }) });
    show(d);
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Finition' })).getByRole('radio', {
        name: 'Impression',
      }),
    );
    expect(d.onChoose).toHaveBeenCalledWith('mug-white', 'card', { finish: 'print' });
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Finition' })).getByRole('radio', {
        name: /Auto/u,
      }),
    );
    expect(d.onChoose).toHaveBeenLastCalledWith('mug-white', 'card', { finish: null });
  });

  it('shows the person choice as checked', () => {
    show(directing({ choices: () => ({ card: { logo: 'black' } }) }));
    expect(
      within(screen.getByRole('radiogroup', { name: 'Logo' })).getByRole('radio', { name: 'Noir' }),
    ).toHaveProperty('checked', true);
  });

  it('announces a change to screen readers', () => {
    show(directing());
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Logo' })).getByRole('radio', { name: 'Noir' }),
    );
    expect(screen.getByRole('status').textContent).toContain('Noir');
  });

  it('undoes and redoes from its buttons and from Ctrl+Z', () => {
    const d = directing({ canUndo: true, canRedo: true });
    show(d);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler le choix' }));
    expect(d.onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Rétablir le choix' }));
    expect(d.onRedo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(d.onUndo).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(d.onRedo).toHaveBeenCalledTimes(2);
  });

  it('leaves Ctrl+Z to a text field: typed text is undone there, not a mockup choice', () => {
    const d = directing({ canUndo: true, canRedo: true });
    show(d);
    for (const tag of ['textarea', 'input'] as const) {
      const field = document.body.appendChild(document.createElement(tag));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      field.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      field.remove();
    }
    expect(d.onUndo).not.toHaveBeenCalled();
  });

  it('disables what cannot be done', () => {
    show(directing());
    expect(screen.getByRole('button', { name: 'Annuler le choix' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Rétablir le choix' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('says a fixed finish is fixed instead of offering a control that does nothing', () => {
    rememberObjects('mug-white', [{ ...card, finishes: ['print'], paints: [] }]);
    renderFr(
      <MockupObjectPanel
        scene="mug-white"
        objectId="card"
        brand="La Meza"
        colors={colors}
        logos={['color']}
        directing={directing()}
      />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Finition' })).toBeNull();
    expect(screen.getByText(frMessages.workspace.mockup.available.finishFixed)).toBeTruthy();
  });

  it('shows the object as soon as the stage has measured it, without waiting for another render', () => {
    renderFr(
      <MockupObjectPanel
        scene="poster-wall"
        objectId="card"
        brand="La Meza"
        colors={colors}
        logos={['color']}
        directing={directing()}
      />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Finition' })).toBeNull();
    act(() => {
      rememberObjects('poster-wall', [card]);
    });
    expect(screen.getByRole('radiogroup', { name: 'Finition' })).toBeTruthy();
  });

  it('names an object by its number in the scene, not by its rank among the measured ones', () => {
    rememberObjects('mug-white', [{ ...card, number: 3 }]);
    renderFr(
      <MockupObjectPanel
        scene="mug-white"
        objectId="card"
        brand="La Meza"
        colors={colors}
        logos={['color']}
        directing={directing()}
      />,
    );
    expect(screen.getByText(/Objet 3/u)).toBeTruthy();
  });

  it('exports the picture from the panel', () => {
    show(directing());
    expect(screen.getByRole('button', { name: 'Exporter cette scène (PNG)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exporter toutes les scènes (ZIP)' })).toBeTruthy();
  });
});
