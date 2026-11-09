import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { publicMetadata } from '../../lib/page-metadata';
import { PricingPage } from '../../landing/pricing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricing');
  return publicMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/tarifs',
  });
}

export default function TarifsPage() {
  return <PricingPage />;
}
