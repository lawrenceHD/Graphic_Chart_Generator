import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getRuntimeEnv } from '../../lib/runtime-env';
import { StartScreen } from '../../start/start-screen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('start');
  return { title: t('metaTitle') };
}

export default function StartPage() {
  return <StartScreen turnstileSiteKey={getRuntimeEnv().TURNSTILE_SITE_KEY} />;
}
