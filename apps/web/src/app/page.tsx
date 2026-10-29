import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Landing } from '../landing/landing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');
  return { title: { absolute: t('metaTitle') } };
}

export default function HomePage() {
  return <Landing />;
}
