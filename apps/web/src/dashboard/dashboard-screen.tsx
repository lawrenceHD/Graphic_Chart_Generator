import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MAIN_ID } from '../components/skip-link-id';
import { PillLink } from '../landing/pill-link';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { ProjectsView } from './projects-view';
import { SignOutButton } from './sign-out-button';

export async function DashboardScreen() {
  const t = await getTranslations('dashboard');
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-ink no-underline"
          >
            Charta
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LocaleSwitch className="hidden sm:flex" />
            <ThemeSwitch />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="mx-auto flex max-w-[1240px] flex-col gap-10 px-6 py-12 focus:outline-none"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <h1 className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.035em]">
              {t('title')}
            </h1>
            <p className="m-0 text-lg text-ink-2">{t('lead')}</p>
          </div>
          <PillLink href="/start" className="min-h-14 px-8 text-base">
            <Plus aria-hidden="true" className="size-5" />
            {t('new')}
          </PillLink>
        </div>
        <ProjectsView />
        <p className="m-0 text-sm text-ink-3">
          {t('quota')}{' '}
          <Link href="/tarifs" className="text-ink-2">
            {t('seePlans')}
          </Link>
        </p>
      </main>
    </div>
  );
}
