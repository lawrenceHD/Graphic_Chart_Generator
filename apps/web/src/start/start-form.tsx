'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { Button } from '../components/button';
import { LogoDropzone } from '../studio/logo-dropzone';
import { holdLogo } from '../studio/pending-logo';
import type { Fetcher } from '../studio/upload';
import { isLightLogoFile } from './logo-image';
import { startProject, type StartFailure } from './start-flow';

// "Démarrer" from the studio mock-up (prototypes/studio, Start.tsx): name, logo and brief on the left,
// a live cover preview on the right. Sending creates the project, then the studio uploads the logo.
const BRIEF_MAX = 8000;
const browserFetch: Fetcher = (input, init) => fetch(input, init);

export function StartForm({
  getTurnstileToken,
  navigate,
  fetcher = browserFetch,
  measureTone = isLightLogoFile,
}: {
  readonly getTurnstileToken: () => Promise<string | null>;
  readonly navigate: (path: string) => void;
  readonly fetcher?: Fetcher;
  readonly measureTone?: (file: File) => Promise<boolean>;
}) {
  const t = useTranslations('start');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [light, setLight] = useState(false);
  const [missing, setMissing] = useState<'name' | 'logo' | null>(null);
  const [failure, setFailure] = useState<StartFailure | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (logo === null) return;
    const url = URL.createObjectURL(logo);
    setPreview(url);
    let current = true;
    void measureTone(logo).then((isLight) => {
      if (current) setLight(isLight);
    });
    return () => {
      current = false;
      URL.revokeObjectURL(url);
    };
  }, [logo, measureTone]);

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const title = name.trim();
    if (title.length === 0 || logo === null) {
      setMissing(title.length === 0 ? 'name' : 'logo');
      return;
    }
    setMissing(null);
    setFailure(null);
    setSending(true);
    try {
      const started = await startProject(
        fetcher,
        { title, briefText: brief.trim() || undefined },
        getTurnstileToken,
      );
      if (!started.ok) {
        setFailure(started.error);
        return;
      }
      holdLogo(started.value, logo);
      navigate(`/studio/${started.value}`);
    } catch {
      setFailure({ kind: 'network' });
    } finally {
      setSending(false);
    }
  };

  const failureText = (current: StartFailure): string => {
    if (current.kind === 'network') return t('network');
    if (current.kind === 'turnstile') return t('turnstile');
    if (current.status === 429) return t('rateLimited');
    if (current.code === 'TURNSTILE_FAILED') return t('turnstile');
    return t('refused', { code: current.code });
  };

  const field =
    'w-full rounded-[14px] border border-line-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-3';

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 text-2xl leading-[1.05] font-bold tracking-tight text-balance sm:text-3xl">
            {t('title')}
          </h1>
          <p className="m-0 text-lg text-ink-2">{t('lead')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="brand-name" className="font-medium">
            {t('name')}
          </label>
          <input
            id="brand-name"
            className={field}
            value={name}
            maxLength={120}
            required
            autoComplete="organization"
            placeholder={t('namePlaceholder')}
            aria-invalid={missing === 'name'}
            aria-describedby={missing === 'name' ? 'brand-name-error' : undefined}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          {missing === 'name' ? (
            <p id="brand-name-error" role="alert" className="m-0 text-sm text-danger">
              {t('needName')}
            </p>
          ) : null}
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-medium">{t('logo')}</legend>
          {logo === null ? (
            <LogoDropzone onAccept={setLogo} disabled={sending} />
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-[14px] border border-line-strong bg-surface px-4 py-3">
              <p className="m-0 min-w-0 truncate text-sm">{t('chosen', { name: logo.name })}</p>
              <Button
                variant="secondary"
                className="rounded-full"
                disabled={sending}
                onClick={() => {
                  setLogo(null);
                  setPreview(null);
                  setLight(false);
                }}
              >
                {t('change')}
              </Button>
            </div>
          )}
          {missing === 'logo' ? (
            <p role="alert" className="m-0 text-sm text-danger">
              {t('needLogo')}
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="brand-brief" className="font-medium">
            {t('brief')}
          </label>
          <p id="brand-brief-hint" className="m-0 text-sm text-ink-2">
            {t('briefHint')}
          </p>
          <textarea
            id="brand-brief"
            className={`${field} min-h-36 resize-y`}
            value={brief}
            maxLength={BRIEF_MAX}
            aria-describedby="brand-brief-hint"
            onChange={(event) => {
              setBrief(event.target.value);
            }}
          />
        </div>

        <div className="flex flex-col items-start gap-3">
          <Button type="submit" disabled={sending} className="min-h-12 rounded-full px-7 text-lg">
            {sending ? t('creating') : t('submit')}
          </Button>
          {failure === null ? null : (
            <p role="alert" className="m-0 text-sm text-danger">
              {failureText(failure)}
            </p>
          )}
        </div>
      </form>

      <aside
        aria-label={t('coverLabel')}
        className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start"
      >
        <p className="m-0 text-sm text-ink-2">{t('coverLabel')}</p>
        <div
          data-testid="cover-preview"
          data-tone={light ? 'dark' : 'light'}
          className={`flex aspect-[4/3] flex-col justify-between rounded-[28px] p-8 shadow-lg ${light ? 'bg-[#26262b] text-[#f6f3ee]' : 'border border-line bg-surface text-ink'}`}
        >
          <p className="m-0 text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
            {t('coverKicker', { year: new Date().getFullYear() })}
          </p>
          <div className="flex min-h-0 flex-1 items-center justify-center py-6">
            {preview === null ? (
              <div className="h-24 w-40 rounded-xl border-2 border-dashed border-current opacity-30" />
            ) : (
              // Decorative: the logo is named by the file label of the form.
              <div
                data-testid="cover-logo"
                aria-hidden="true"
                className="h-40 w-[70%] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${preview}")` }}
              />
            )}
          </div>
          <p className="m-0 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {name.trim() || t('coverName')}
          </p>
        </div>
        {light ? <p className="m-0 text-sm text-ink-2">{t('darkBackground')}</p> : null}
      </aside>
    </div>
  );
}
