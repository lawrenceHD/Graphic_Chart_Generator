'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MAIN_ID } from '../components/skip-link-id';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { StartForm } from './start-form';
import { useTurnstile } from './turnstile';

export function StartScreen({ turnstileSiteKey }: { readonly turnstileSiteKey: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { box, getToken } = useTurnstile(turnstileSiteKey);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-full pr-4 pl-2 text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('start.home')}
        </Link>
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-ink no-underline"
        >
          {t('common.appName')}
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitch className="hidden sm:flex" />
          <ThemeSwitch />
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto max-w-[1240px] px-6 pt-6 pb-20 focus:outline-none sm:pt-10"
      >
        <StartForm
          getTurnstileToken={getToken}
          navigate={(path) => {
            router.push(path);
          }}
        />
        <div ref={box} className="mt-6" />
      </main>
    </div>
  );
}
