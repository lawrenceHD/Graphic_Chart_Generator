import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthScreen } from '../../auth/auth-screen';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('loginMeta') };
}

export default function ConnexionPage() {
  return <AuthScreen mode="login" />;
}
