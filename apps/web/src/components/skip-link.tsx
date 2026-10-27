import { getTranslations } from 'next-intl/server';

export const MAIN_ID = 'contenu';

export async function SkipLink() {
  const t = await getTranslations('common');
  return (
    <a
      href={`#${MAIN_ID}`}
      className="sr-only rounded-sm bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      {t('skipToContent')}
    </a>
  );
}
