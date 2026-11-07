import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { DashboardScreen } from '../../dashboard/dashboard-screen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return { title: t('metaTitle') };
}

export default function ProjetsPage() {
  return <DashboardScreen />;
}
