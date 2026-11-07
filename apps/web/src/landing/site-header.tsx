import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { PillLink } from './pill-link';

const LINK =
  'inline-flex min-h-11 items-center rounded-full px-3 text-sm text-ink-2 no-underline transition-colors hover:bg-elevated hover:text-ink';

/** Header of the public pages (home, pricing). `home` switches the anchors to in-page links. */
export async function SiteHeader({ onHome = false }: { readonly onHome?: boolean }) {
  const t = await getTranslations('site');
  const base = onHome ? '' : '/';
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 px-6 py-2">
        <Link
          href="/"
          aria-label={t('home')}
          className="font-display text-xl font-bold tracking-tight text-ink no-underline"
        >
          Charta
        </Link>
        <nav
          aria-label={t('nav')}
          className="order-last flex w-full items-center gap-1 overflow-x-auto md:order-none md:w-auto"
        >
          <a href={`${base}#atelier`} className={LINK}>
            {t('atelier')}
          </a>
          <a href={`${base}#methode`} className={LINK}>
            {t('method')}
          </a>
          <Link href="/tarifs" className={LINK}>
            {t('pricing')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitch className="hidden sm:flex" />
          <ThemeSwitch />
          <Link href="/connexion" className={`${LINK} hidden sm:inline-flex`}>
            {t('login')}
          </Link>
          <PillLink href="/start" className="hidden lg:inline-flex">
            {t('try')}
          </PillLink>
        </div>
      </div>
    </header>
  );
}
