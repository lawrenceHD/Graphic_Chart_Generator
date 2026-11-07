import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const LINK = 'text-sm text-ink-2 no-underline hover:text-ink hover:underline';

export async function SiteFooter() {
  const t = await getTranslations('site');
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex max-w-[40ch] flex-col gap-3">
          <span className="font-display text-xl font-bold tracking-tight">Charta</span>
          <p className="m-0 text-sm text-ink-2">{t('footerTagline')}</p>
        </div>
        <nav aria-label={t('footerProduct')} className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t('footerProduct')}</span>
          <Link href="/start" className={LINK}>
            {t('try')}
          </Link>
          <Link href="/tarifs" className={LINK}>
            {t('pricing')}
          </Link>
        </nav>
        <nav aria-label={t('footerAccount')} className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t('footerAccount')}</span>
          <Link href="/connexion" className={LINK}>
            {t('login')}
          </Link>
          <Link href="/inscription" className={LINK}>
            {t('signup')}
          </Link>
          <Link href="/projets" className={LINK}>
            {t('projects')}
          </Link>
        </nav>
      </div>
      <p className="mx-auto m-0 max-w-[1240px] px-6 pb-8 text-xs text-ink-3">{t('rights')}</p>
    </footer>
  );
}
