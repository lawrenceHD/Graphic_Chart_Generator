import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PricingPage } from '../../landing/pricing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pricing');
  return { title: t('metaTitle') };
}

export default function TarifsPage() {
  return <PricingPage />;
}
