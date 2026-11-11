'use client';

import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from './top-bar';

// Moving through a guideline of thirty sheets without scrolling past each one: previous, next, where the
// person is ("07 / 25"), and the contents, a disclosure listing every page and the mockups. The
// contents is a navigation, not a choice of value: a list of buttons, the current page marked, closed
// by Escape, a jump or a click outside, focus given back to its button.
export interface NavEntry {
  readonly id: string;
  readonly title: string;
}

const two = (value: number): string => String(value).padStart(2, '0');

export function PageNavigator({
  entries,
  current,
  onGo,
  onMockups,
}: {
  readonly entries: readonly NavEntry[];
  /** The selected page, null when a mockup is selected (navigation then starts from the first page). */
  readonly current: string | null;
  readonly onGo: (id: string) => void;
  /** Goes to the mockups section, offered as the last stop of the contents when given. */
  readonly onMockups?: () => void;
}) {
  const t = useTranslations('workspace.pageNav');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const listId = useId();
  const index = entries.findIndex((entry) => entry.id === current);
  const total = entries.length;

  const close = (focusBack: boolean): void => {
    setOpen(false);
    if (focusBack) trigger.current?.focus();
  };
  const go = (jump: () => void): void => {
    jump();
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    // The current page (else the first) takes focus, so arrows and Tab start from where the person is.
    const node = panel.current;
    const target =
      node?.querySelector<HTMLButtonElement>('[aria-current="page"]') ??
      node?.querySelector<HTMLButtonElement>('button');
    target?.focus();
    const onOutside = (event: PointerEvent): void => {
      const inside =
        event.target instanceof Node &&
        (panel.current?.contains(event.target) === true ||
          trigger.current?.contains(event.target) === true);
      if (!inside) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [open]);

  const moveFocus = (step: 1 | -1 | 'first' | 'last'): void => {
    const buttons = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    if (buttons.length === 0) return;
    const at = buttons.findIndex((button) => button === document.activeElement);
    const next =
      step === 'first'
        ? 0
        : step === 'last'
          ? buttons.length - 1
          : (((at < 0 ? 0 : at + step) % buttons.length) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  if (total === 0) return null;
  const position = index < 0 ? null : index + 1;

  return (
    // Not positioned: the contents is placed against the whole floating bar, which is centred on the table,
    // so it is not cut on a narrow screen. Escape and focus leaving are handled for the button and the list.
    <div
      className="flex items-center gap-0.5"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          close(true);
        }
      }}
      onBlur={(event) => {
        const to = event.relatedTarget;
        if (open && to instanceof Node && !event.currentTarget.contains(to)) setOpen(false);
      }}
    >
      <IconButton
        label={t('previous')}
        disabled={index <= 0}
        onClick={() => {
          const target = entries[index - 1];
          if (target !== undefined) onGo(target.id);
        }}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </IconButton>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={
          position === null
            ? t('contents')
            : `${t('contents')}, ${t('position', { n: position, total })}`
        }
        title={t('contents')}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex h-10 items-center gap-1.5 rounded-full px-3 text-ink-2 transition-colors hover:bg-elevated hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-expanded:bg-elevated aria-expanded:text-ink"
      >
        <List aria-hidden="true" className="size-4" />
        <span className="tabular font-mono text-xs">
          {position === null ? '--' : two(position)} / {two(total)}
        </span>
      </button>
      <IconButton
        label={t('next')}
        disabled={index >= total - 1}
        onClick={() => {
          const target = entries[index + 1];
          if (target !== undefined) onGo(target.id);
        }}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </IconButton>
      {open ? (
        <nav
          ref={panel}
          id={listId}
          aria-label={t('contentsLabel')}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'ArrowDown':
                event.preventDefault();
                moveFocus(1);
                break;
              case 'ArrowUp':
                event.preventDefault();
                moveFocus(-1);
                break;
              case 'Home':
                event.preventDefault();
                moveFocus('first');
                break;
              case 'End':
                event.preventDefault();
                moveFocus('last');
                break;
              default:
                break;
            }
          }}
          className="absolute bottom-[calc(100%+12px)] left-1/2 max-h-[min(60dvh,520px)] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_-8px_oklch(0.2_0.01_60/0.25)]"
        >
          <ol className="m-0 list-none p-0">
            {entries.map((entry, at) => {
              const here = at === index;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-current={here ? 'page' : undefined}
                    onClick={() => {
                      go(() => {
                        onGo(entry.id);
                      });
                    }}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${here ? 'bg-elevated text-ink' : 'text-ink-2'}`}
                  >
                    <span className="tabular w-6 shrink-0 font-mono text-xs text-ink-3">
                      {two(at + 1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {onMockups === undefined ? null : (
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                onClick={() => {
                  go(onMockups);
                }}
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink-2 transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
              >
                <span className="w-6 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{t('mockups')}</span>
              </button>
            </div>
          )}
        </nav>
      ) : null}
    </div>
  );
}
