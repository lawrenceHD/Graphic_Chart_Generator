import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { MobileMenu, type MenuItem } from './mobile-menu';
import { PillLink } from './pill-link';

const LINK =
  'hidden min-h-11 items-center rounded-full px-3 text-sm text-ink-2 no-underline transition-colors hover:bg-elevated hover:text-ink md:inline-flex';

/**
 * Header of the public pages (home, pricing): one row at every width. From `md` the sections sit in the bar;
 * below it they move into the menu with the language and the theme. `onHome` switches the anchors to in-page links.
 */
export async function SiteHeader({ onHome = false }: { readonly onHome?: boolean }) {
  const t = await getTranslations('site');
  const base = onHome ? '' : '/';
  const items: readonly MenuItem[] = [
    { href: `${base}#fonctionnement`, label: t('method'), page: false },
    { href: `${base}#charte`, label: t('atelier'), page: false },
    { href: `${base}#mockups`, label: t('mockups'), page: false },
    { href: '/tarifs', label: t('pricing'), page: true },
    { href: '/connexion', label: t('login'), page: true },
  ];
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="glass mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-full border border-line bg-surface/85 py-2 pr-2 pl-5 shadow-lg backdrop-blur-md">
        <Link
          href="/"
          aria-label={t('home')}
          className="font-display text-xl font-bold tracking-tight text-ink no-underline"
        >
          Charta
        </Link>
        <nav aria-label={t('nav')} className="hidden items-center gap-1 md:flex">
          {items.slice(0, 4).map((item) =>
            item.page ? (
              <Link key={item.href} href={item.href} className={LINK}>
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className={LINK}>
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden md:block">
            <LocaleSwitch />
          </div>
          <div className="hidden md:block">
            <ThemeSwitch />
          </div>
          <Link href="/connexion" className={LINK}>
            {t('login')}
          </Link>
          <PillLink href="/start" className="px-4 sm:px-6">
            {t('try')}
          </PillLink>
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}
