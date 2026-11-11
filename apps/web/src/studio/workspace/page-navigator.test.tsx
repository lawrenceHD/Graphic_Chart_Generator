// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderFr } from '../intl-test-utils';
import { PageNavigator } from './page-navigator';

const entries = [
  { id: 'p1', title: 'Couverture' },
  { id: 'p2', title: 'Logo' },
  { id: 'p3', title: 'Palette' },
];

function show(current: string | null, onGo = vi.fn()) {
  renderFr(<PageNavigator entries={entries} current={current} onGo={onGo} />);
  return onGo;
}

afterEach(cleanup);

describe('PageNavigator', () => {
  it('says where the person is in the guideline', () => {
    show('p2');
    expect(screen.getByRole('button', { name: /Sommaire/u }).textContent).toContain('02 / 03');
  });

  it('goes to the previous and the next page', () => {
    const onGo = show('p2');
    fireEvent.click(screen.getByRole('button', { name: 'Page précédente' }));
    expect(onGo).toHaveBeenLastCalledWith('p1');
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onGo).toHaveBeenLastCalledWith('p3');
  });

  it('cannot go before the first page nor after the last', () => {
    show('p1');
    expect(screen.getByRole('button', { name: 'Page précédente' })).toHaveProperty(
      'disabled',
      true,
    );
    cleanup();
    show('p3');
    expect(screen.getByRole('button', { name: 'Page suivante' })).toHaveProperty('disabled', true);
  });

  it('starts from the first page when a mockup, not a page, is selected', () => {
    const onGo = show(null);
    expect(screen.getByRole('button', { name: 'Page précédente' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onGo).toHaveBeenLastCalledWith('p1');
  });

  it('opens the contents, jumps to a page and closes', () => {
    const onGo = show('p1');
    const trigger = screen.getByRole('button', { name: /Sommaire/u });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('navigation', { name: 'Sommaire de la charte' });
    const current = within(list).getByRole('button', { name: /Couverture/u });
    expect(current.getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(list).getByRole('button', { name: /Palette/u }));
    expect(onGo).toHaveBeenLastCalledWith('p3');
    expect(screen.queryByRole('navigation', { name: 'Sommaire de la charte' })).toBeNull();
  });

  it('closes the contents on Escape and gives focus back to its button', () => {
    show('p1');
    const trigger = screen.getByRole('button', { name: /Sommaire/u });
    fireEvent.click(trigger);
    const list = screen.getByRole('navigation', { name: 'Sommaire de la charte' });
    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Sommaire de la charte' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('gives focus back to its button after a jump, so the keyboard does not fall to the page', () => {
    show('p1');
    const trigger = screen.getByRole('button', { name: /Sommaire/u });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /Palette/u }));
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the contents on Escape from its own button too', () => {
    show('p1');
    const trigger = screen.getByRole('button', { name: /Sommaire/u });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('names its button without a dangling comma when no page is selected', () => {
    show(null);
    expect(screen.getByRole('button', { name: 'Sommaire' })).toBeTruthy();
  });

  it('closes the contents when focus leaves it with Tab', () => {
    show('p1');
    fireEvent.click(screen.getByRole('button', { name: /Sommaire/u }));
    const list = screen.getByRole('navigation', { name: 'Sommaire de la charte' });
    const outside = document.body.appendChild(document.createElement('button'));
    fireEvent.focusOut(within(list).getByRole('button', { name: /Couverture/u }), {
      relatedTarget: outside,
    });
    expect(screen.queryByRole('navigation', { name: 'Sommaire de la charte' })).toBeNull();
    outside.remove();
  });

  it('lists the mockups as the last stop when there are some', () => {
    const onGo = vi.fn();
    const onMockups = vi.fn();
    renderFr(<PageNavigator entries={entries} current="p3" onGo={onGo} onMockups={onMockups} />);
    fireEvent.click(screen.getByRole('button', { name: /Sommaire/u }));
    fireEvent.click(screen.getByRole('button', { name: /Mises en situation/u }));
    expect(onMockups).toHaveBeenCalledTimes(1);
    expect(onGo).not.toHaveBeenCalled();
  });
});
