'use client';

import { ExternalLink, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import type { Fetcher } from '../upload';

// Inspirations from public sources (Are.na channels kept by designers), searched when the person asks, from
// the sector and the spirit the analysis found. They are other people's work: shown from their source with
// their author and a link to the original, never copied, never placed in the guideline or its export.
const https = (host?: string) =>
  z.string().refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        url.username === '' &&
        url.password === '' &&
        url.port === '' &&
        (host === undefined || url.hostname === host)
      );
    } catch {
      return false; // not a URL: the entry is dropped
    }
  });
const Entry = z.object({
  id: z.string().min(1),
  kind: z.enum(['mockup', 'usage']),
  title: z.string(),
  thumbnail: https('images.are.na'),
  link: https(),
  author: z.string().nullable(),
  via: https('www.are.na'),
});
type Entry = z.infer<typeof Entry>;
const Answer = z.object({ items: z.array(z.unknown()) });

type State =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'ready'; readonly items: readonly Entry[] };

async function load(fetcher: Fetcher, projectId: string): Promise<readonly Entry[] | null> {
  try {
    const response = await fetcher(`/api/v1/projects/${projectId}/inspirations`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const answer = Answer.safeParse(await response.json());
    if (!answer.success) return null;
    return answer.data.items.flatMap((raw) => {
      const parsed = Entry.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return null; // offline or refused: shown as unavailable, with a retry
  }
}

export function InspirationsPanel({
  projectId,
  fetcher = (input, init) => fetch(input, init),
}: {
  readonly projectId: string;
  readonly fetcher?: Fetcher;
}) {
  const t = useTranslations('workspace.inspirations');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const search = async (): Promise<void> => {
    setState({ kind: 'loading' });
    const items = await load(fetcher, projectId);
    setState(items === null ? { kind: 'failed' } : { kind: 'ready', items });
  };

  const group = (kind: Entry['kind'], items: readonly Entry[]) => {
    const shown = items.filter((item) => item.kind === kind);
    if (shown.length === 0) return null;
    return (
      <div className="mt-8">
        <h3 className="m-0 mb-3 text-sm font-semibold text-ink">
          {t(kind === 'mockup' ? 'mockups' : 'usage')}
        </h3>
        <ul
          aria-label={t(kind === 'mockup' ? 'mockups' : 'usage')}
          className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3"
        >
          {shown.map((item) => (
            <li key={item.id} className="min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <img
                  src={item.thumbnail}
                  alt={item.title === '' ? t('untitled') : item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full rounded-xl border border-line bg-elevated object-cover"
                />
                <span className="mt-2 flex items-center gap-1 text-sm text-ink">
                  <span className="min-w-0 truncate">
                    {item.title === '' ? t('untitled') : item.title}
                  </span>
                  <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-ink-3" />
                </span>
              </a>
              <p className="m-0 mt-0.5 truncate text-xs text-ink-2">
                {item.author === null ? null : `${item.author} · `}
                <a
                  href={item.via}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line underline-offset-2 hover:text-ink"
                >
                  {t('via')}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <section aria-labelledby="inspirations-title" className="mt-20 scroll-mt-14">
      <h2
        id="inspirations-title"
        className="m-0 mb-1 font-display text-3xl font-bold tracking-tight"
      >
        {t('title')}
      </h2>
      <p className="m-0 max-w-xl text-sm text-ink-2">{t('lead')}</p>
      <p className="m-0 mt-2 max-w-xl text-xs text-ink-3">{t('notice')}</p>
      {state.kind === 'idle' || state.kind === 'loading' ? (
        <button
          type="button"
          disabled={state.kind === 'loading'}
          aria-busy={state.kind === 'loading'}
          onClick={() => void search()}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm font-semibold text-ink transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          <Search aria-hidden="true" className="size-4" />
          {state.kind === 'loading' ? t('searching') : t('search')}
        </button>
      ) : null}
      {state.kind === 'failed' ? (
        <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-ink-2">
          <span>{t('unavailable')}</span>
          <button
            type="button"
            onClick={() => void search()}
            className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 font-semibold text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t('retry')}
          </button>
        </div>
      ) : null}
      {state.kind === 'ready' ? (
        state.items.length === 0 ? (
          <p className="m-0 mt-5 text-sm text-ink-2">{t('empty')}</p>
        ) : (
          <>
            {group('mockup', state.items)}
            {group('usage', state.items)}
          </>
        )
      ) : null}
    </section>
  );
}
