import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { publicMetadata } from '../../lib/page-metadata';
import { AuthScreen } from '../../auth/auth-screen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return publicMetadata({
    title: t('signupMeta'),
    description: t('signupDescription'),
    path: '/inscription',
    indexable: false,
  });
}

export default function InscriptionPage() {
  return <AuthScreen mode="signup" />;
}
