import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { publicMetadata } from '../lib/page-metadata';
import { Landing } from '../landing/landing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('homePage');
  return publicMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/',
    image: '/og/home.png',
  });
}

export default function HomePage() {
  return <Landing />;
}
