import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { SkipLink } from '../components/skip-link';
import { THEME_COOKIE, parseThemePreference, themeAttribute } from '../theme/preference';
import { PreferencesProvider } from '../ui/preferences';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: { default: t('appName'), template: `%s · ${t('appName')}` },
    description: t('description'),
  };
}

// Every page is rendered per request so Next.js can apply the CSP nonce (ADR-024). The theme is
// rendered on the server from the cookie: no inline script, no flash of the wrong theme. Each screen
// (landing, start, studio) draws its own chrome and its own <main id="contenu">.
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const locale = await getLocale();
  const theme = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} data-theme={themeAttribute(theme)}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>
          <PreferencesProvider initialTheme={theme}>
            <SkipLink />
            {children}
          </PreferencesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
