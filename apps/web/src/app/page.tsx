import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { StatusMessage } from '../components/status-message';
import { THEME_PREFERENCES } from '../theme/preference';

// Landing frozen (09 §1.5): this page only shows the interface foundations, not the final landing.
export default async function HomePage() {
  const t = await getTranslations('home');
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">
        {t('title')}
      </h1>
      <p className="text-lg text-ink-2">{t('lead')}</p>
      <Link
        href="/start"
        className="inline-flex min-h-12 w-fit items-center rounded-full bg-accent px-7 text-lg font-medium text-on-accent hover:opacity-90"
      >
        {t('cta')}
      </Link>
      <StatusMessage tone="info">{t('preview', { count: THEME_PREFERENCES.length })}</StatusMessage>
    </div>
  );
}
