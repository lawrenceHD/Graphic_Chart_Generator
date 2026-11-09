'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef } from 'react';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';

export interface MenuItem {
  readonly href: string;
  readonly label: string;
  /** A route of the app (client navigation) rather than an anchor of the current page. */
  readonly page: boolean;
}

const ITEM = 'flex min-h-12 items-center text-lg text-ink no-underline';

/**
 * Menu of the narrow header: a modal dialog (focus kept inside, Escape closes, focus returns to the button),
 * holding what the compact bar leaves out: the sections, the account link, the language and the theme.
 */
export function MobileMenu({ items }: { readonly items: readonly MenuItem[] }) {
  const t = useTranslations('site');
  const dialog = useRef<HTMLDialogElement>(null);
  const close = (): void => {
    dialog.current?.close();
  };
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
        }}
        className="grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface text-ink"
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">{t('menu')}</span>
      </button>
      <dialog
        ref={dialog}
        aria-label={t('menu')}
        className="m-0 mt-3 mr-3 ml-auto max-h-[calc(100dvh-1.5rem)] w-[min(22rem,calc(100vw-1.5rem))] rounded-3xl border border-line bg-surface p-5 text-ink backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-bold">Charta</span>
          <button
            type="button"
            onClick={close}
            className="grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong"
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">{t('close')}</span>
          </button>
        </div>
        <nav aria-label={t('nav')} className="mt-4 flex flex-col">
          {items.map((item) =>
            item.page ? (
              <Link key={item.href} href={item.href} onClick={close} className={ITEM}>
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} onClick={close} className={ITEM}>
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-3">
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </dialog>
    </div>
  );
}
