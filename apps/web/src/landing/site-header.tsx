import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { PillLink } from './pill-link';

// Display utilities are chosen per link, never stacked (two of them fight and the later one wins).
const LINK_STYLE =
  'min-h-11 items-center rounded-full px-3 text-sm text-ink-2 no-underline transition-colors hover:bg-elevated hover:text-ink';
const SHOWN = `inline-flex ${LINK_STYLE}`;
const FROM_SM = `hidden sm:inline-flex ${LINK_STYLE}`;
const BELOW_SM = `inline-flex sm:hidden ${LINK_STYLE}`;

/** Header of the public pages (home, pricing). `onHome` switches the anchors to in-page links. */
export async function SiteHeader({ onHome = false }: { readonly onHome?: boolean }) {
  const t = await getTranslations('site');
  const base = onHome ? '' : '/';
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="glass mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-3xl border border-line bg-surface/85 px-4 py-2 shadow-lg backdrop-blur-md md:rounded-full sm:px-5">
        <Link
          href="/"
          aria-label={t('home')}
          className="font-display text-xl font-bold tracking-tight text-ink no-underline"
        >
          Charta
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {/* A wrapper hides it: the switch brings its own `flex`, which would fight a `hidden` className. */}
          <div className="hidden sm:block">
            <LocaleSwitch />
          </div>
          <ThemeSwitch />
          <Link href="/connexion" className={FROM_SM}>
            {t('login')}
          </Link>
          <PillLink href="/start" className="px-4 sm:px-6">
            {t('try')}
          </PillLink>
        </div>
        <nav
          aria-label={t('nav')}
          className="order-last flex w-full min-w-0 items-center gap-1 overflow-x-auto md:order-none md:w-auto"
        >
          <a href={`${base}#fonctionnement`} className={SHOWN}>
            {t('method')}
          </a>
          <a href={`${base}#charte`} className={SHOWN}>
            {t('atelier')}
          </a>
          <a href={`${base}#mockups`} className={SHOWN}>
            {t('mockups')}
          </a>
          <Link href="/tarifs" className={SHOWN}>
            {t('pricing')}
          </Link>
          <Link href="/connexion" className={BELOW_SM}>
            {t('login')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
