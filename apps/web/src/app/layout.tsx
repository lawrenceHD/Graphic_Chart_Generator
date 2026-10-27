import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { MAIN_ID, SkipLink } from '../components/skip-link';
import { PreferencesBar } from '../components/preferences-bar';
import { THEME_COOKIE, parseThemePreference, themeAttribute } from '../theme/preference';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: { default: t('appName'), template: `%s · ${t('appName')}` },
    description: t('description'),
  };
}

// Every page is rendered per request so Next.js can apply the CSP nonce (ADR-024). The theme is
// rendered on the server from the cookie: no inline script, no flash of the wrong theme.
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('common');
  const theme = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} data-theme={themeAttribute(theme)}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>
          <SkipLink />
          <header className="border-b border-line">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
              <p className="text-lg font-semibold">{t('appName')}</p>
              <PreferencesBar initialTheme={theme} />
            </div>
          </header>
          <main
            id={MAIN_ID}
            tabIndex={-1}
            className="mx-auto max-w-6xl px-6 py-12 focus:outline-none"
          >
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
