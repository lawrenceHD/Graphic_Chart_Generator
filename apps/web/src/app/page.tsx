import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeJsonLd } from '../landing/json-ld';
import { Landing } from '../landing/landing';
import { publicMetadata } from '../lib/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('homePage');
  return publicMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/',
    image: '/og/home.png',
  });
}

export default async function HomePage() {
  const t = await getTranslations('homePage');
  return (
    <>
      <HomeJsonLd description={t('metaDescription')} />
      <Landing />
    </>
  );
}
