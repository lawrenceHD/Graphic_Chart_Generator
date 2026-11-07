'use client';

import { Loader2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '../components/button';
import { PillLink } from '../landing/pill-link';
import {
  loadProjects,
  type ListFetcher,
  type ProjectRow,
  type ProjectsState,
} from './projects-data';

const browserFetch: ListFetcher = (path) => fetch(path);

function ProjectCard({ project }: { readonly project: ProjectRow }) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  return (
    <li>
      <Link
        href={`/studio/${project.id}`}
        aria-label={t('open', { title: project.title })}
        className="flex h-full flex-col gap-4 rounded-lg border border-line bg-surface p-4 text-ink no-underline transition-colors hover:bg-elevated"
      >
        <span
          aria-hidden="true"
          className="grid aspect-video place-items-center rounded-md bg-preview font-display text-4xl font-extrabold text-ink-2"
        >
          {project.title.trim().charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-display text-xl font-bold tracking-tight">
            {project.title}
          </span>
          <span className="truncate text-sm text-ink-2">
            {project.industryLabel ?? t('noSector')}
          </span>
          <span className="text-xs text-ink-3">
            {t('updated', {
              date: format.dateTime(new Date(project.updatedAt), { dateStyle: 'medium' }),
            })}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Notice({
  title,
  text,
  children,
}: {
  readonly title: string;
  readonly text: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex max-w-[52ch] flex-col items-start gap-4 rounded-xl border border-line bg-surface p-8">
      <h2 className="m-0 font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="m-0 text-base text-ink-2">{text}</p>
      {children}
    </div>
  );
}

/** "Mes projets": the list is read from GET /api/v1/projects, each state has its own message. */
export function ProjectsView({ fetcher = browserFetch }: { readonly fetcher?: ListFetcher }) {
  const t = useTranslations('dashboard');
  const [state, setState] = useState<ProjectsState | null>(null);

  const load = useCallback(() => {
    setState(null);
    void loadProjects(fetcher).then(setState);
  }, [fetcher]);
  useEffect(load, [load]);

  if (state === null) {
    return (
      <p role="status" className="m-0 flex items-center gap-3 text-ink-2">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        {t('loading')}
      </p>
    );
  }
  switch (state.kind) {
    case 'ready':
      return (
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {state.projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ul>
      );
    case 'empty':
      return (
        <Notice title={t('empty.title')} text={t('empty.text')}>
          <PillLink href="/start">{t('new')}</PillLink>
        </Notice>
      );
    case 'signed-out':
      return (
        <Notice title={t('signedOut.title')} text={t('signedOut.text')}>
          <PillLink href="/connexion">{t('signedOut.cta')}</PillLink>
        </Notice>
      );
    case 'error':
      return (
        <div role="alert">
          <Notice title={t('error.title')} text={t('error.text')}>
            <Button variant="secondary" className="rounded-full" onClick={load}>
              {t('error.retry')}
            </Button>
          </Notice>
        </div>
      );
  }
}
