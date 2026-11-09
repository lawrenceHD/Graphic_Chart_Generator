import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { publicMetadata } from '../../lib/page-metadata';
import { AuthScreen } from '../../auth/auth-screen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return publicMetadata({
    title: t('loginMeta'),
    description: t('loginDescription'),
    path: '/connexion',
    indexable: false,
  });
}

export default function ConnexionPage() {
  return <AuthScreen mode="login" />;
}
