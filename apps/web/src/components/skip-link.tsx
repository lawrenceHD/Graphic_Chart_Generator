import { getTranslations } from 'next-intl/server';

import { MAIN_ID } from './skip-link-id';

export { MAIN_ID };

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
