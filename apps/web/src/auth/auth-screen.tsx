import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MAIN_ID } from '../components/skip-link-id';
import { PillLink } from '../landing/pill-link';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { AuthPanel } from './auth-panel';
import type { AuthMode } from './auth-logic';

/** Sign-in and sign-up pages: the form leads, the guest way in sits beside it, never behind a wall. */
export async function AuthScreen({ mode }: { readonly mode: AuthMode }) {
  const t = await getTranslations('auth');
  const other = mode === 'login' ? '/inscription' : '/connexion';
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full pr-4 pl-2 text-sm text-ink-2 no-underline transition-colors hover:bg-elevated hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('back')}
        </Link>
        <span className="font-display text-xl font-bold tracking-tight">Charta</span>
        <div className="flex items-center gap-2">
          <LocaleSwitch className="hidden sm:flex" />
          <ThemeSwitch />
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto grid max-w-[1240px] gap-12 px-6 pt-8 pb-20 focus:outline-none lg:grid-cols-12 lg:pt-16"
      >
        <div className="flex max-w-[460px] flex-col gap-8 lg:col-span-6">
          <div className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
              {t(`${mode}.title`)}
            </h1>
            <p className="m-0 text-lg text-ink-2">{t(`${mode}.lead`)}</p>
          </div>
          <AuthPanel mode={mode} />
          <p className="m-0 text-sm text-ink-2">
            {t(`${mode}.switchText`)}{' '}
            <Link href={other} className="font-medium text-ink">
              {t(`${mode}.switchLink`)}
            </Link>
          </p>
        </div>
        <aside className="flex flex-col gap-4 self-start rounded-xl border border-line bg-surface p-6 lg:col-span-5 lg:col-start-8">
          <h2 className="m-0 font-display text-2xl font-bold tracking-tight">{t('guest.title')}</h2>
          <p className="m-0 text-base text-ink-2">{t('guest.text')}</p>
          <PillLink href="/start" variant="secondary" className="self-start">
            {t('guest.cta')}
          </PillLink>
        </aside>
      </main>
    </div>
  );
}
