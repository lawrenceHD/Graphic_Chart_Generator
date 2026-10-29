'use client';

import { ArrowRight, ImageUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { Button } from '../components/button';
import { LogoDropzone } from '../studio/logo-dropzone';
import { holdLogo } from '../studio/pending-logo';
import type { Fetcher } from '../studio/upload';
import { isLightLogoFile } from './logo-image';
import { startProject, type StartFailure } from './start-flow';

// "Démarrer" from the studio mock-up (prototypes/studio, Start.tsx): the logo first (critique 2026-10-23), then
// the name and the brief, beside a 16:9 cover preview that follows what is typed. Sending creates the project, then the studio uploads the logo.
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
    'w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base text-ink transition-colors placeholder:text-ink-3 focus:border-focus';
  const lead = brief.trim().split(/\n+/u)[0]?.slice(0, 140) ?? '';

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-9 lg:col-span-6"
      >
        <div className="flex flex-col gap-4">
          <h1 className="m-0 font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.035em] text-balance">
            {t('title')}
          </h1>
          <p className="m-0 max-w-[52ch] text-lg text-ink-2">{t('lead')}</p>
        </div>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-3 flex w-full items-baseline justify-between p-0">
            <span className="text-base font-semibold">{t('logo')}</span>
            <span className="text-sm text-ink-3">{t('logoHint')}</span>
          </legend>
          {logo === null ? (
            <LogoDropzone onAccept={setLogo} disabled={sending} />
          ) : (
            <div className="flex items-center gap-4 rounded-xl border border-line-strong bg-surface p-3">
              <div
                aria-hidden="true"
                className={`size-14 shrink-0 rounded-lg bg-contain bg-center bg-no-repeat ${light ? 'bg-[oklch(0.25_0.01_60)]' : 'bg-preview'}`}
                style={preview === null ? undefined : { backgroundImage: `url("${preview}")` }}
              />
              <p className="m-0 min-w-0 flex-1 truncate text-sm">
                {t('chosen', { name: logo.name })}
              </p>
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
          <label htmlFor="brand-name" className="text-base font-semibold">
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

        <div className="flex flex-col gap-2">
          <label htmlFor="brand-brief" className="text-base font-semibold">
            {t('brief')}
          </label>
          <p id="brand-brief-hint" className="m-0 text-sm text-ink-2">
            {t('briefHint')}
          </p>
          <textarea
            id="brand-brief"
            className={`${field} min-h-40 resize-y leading-relaxed`}
            value={brief}
            maxLength={BRIEF_MAX}
            aria-describedby="brand-brief-hint"
            placeholder={t('briefPlaceholder')}
            onChange={(event) => {
              setBrief(event.target.value);
            }}
          />
          <p className="tabular m-0 self-end font-mono text-xs text-ink-3">
            {brief.length} / {BRIEF_MAX}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3">
          <button
            type="submit"
            disabled={sending}
            className="group inline-flex h-14 items-center gap-3 rounded-full bg-accent pr-2.5 pl-7 text-lg font-semibold text-on-accent transition-opacity disabled:opacity-60"
          >
            {sending ? t('creating') : t('submit')}
            <span className="grid size-9 place-items-center rounded-full bg-on-accent text-accent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5">
              {sending ? (
                <Loader2
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <ArrowRight aria-hidden="true" className="size-4" />
              )}
            </span>
          </button>
          <p className="m-0 text-sm text-ink-3">{t('after')}</p>
          {failure === null ? null : (
            <p role="alert" className="m-0 text-sm text-danger">
              {failureText(failure)}
            </p>
          )}
        </div>
      </form>

      <aside
        aria-label={t('coverLabel')}
        className="flex flex-col gap-3 lg:sticky lg:top-8 lg:col-span-6 lg:self-start"
      >
        <p className="m-0 text-sm text-ink-2">{t('coverLabel')}</p>
        <div
          data-testid="cover-preview"
          data-tone={light ? 'dark' : 'light'}
          className={`@container relative flex aspect-[16/9] flex-col justify-between overflow-hidden rounded-[20px] p-[5cqw] shadow-[0_1px_2px_oklch(0.2_0.01_60/0.06),0_30px_60px_-28px_oklch(0.2_0.01_60/0.45)] transition-colors duration-500 ${light ? 'bg-[oklch(0.22_0.01_60)] text-[oklch(0.97_0.008_85)]' : 'bg-surface text-ink'}`}
        >
          <div className="flex justify-between font-mono text-[1.6cqw] tracking-[0.16em] uppercase opacity-70">
            <span>{t('coverKicker', { year: new Date().getFullYear() })}</span>
            <span>01</span>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 items-end gap-[4cqw]">
            <div className="min-w-0">
              <p className="m-0 truncate font-display text-[8cqw] leading-[0.9] font-bold tracking-[-0.035em]">
                {name.trim() || t('coverName')}
              </p>
              <p className="m-0 mt-[1.6cqw] line-clamp-2 text-[1.9cqw] leading-snug opacity-75">
                {lead === '' ? t('coverLead') : lead}
              </p>
            </div>
            <div className="grid h-full place-items-center">
              {preview === null ? (
                <div className="grid h-[60%] w-[80%] place-items-center rounded-[2cqw] border-2 border-dashed border-current opacity-25">
                  <ImageUp aria-hidden="true" className="size-[5cqw]" />
                </div>
              ) : (
                // Decorative: the logo is named by the file label of the form.
                <div
                  data-testid="cover-logo"
                  aria-hidden="true"
                  className="h-[70%] w-[90%] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${preview}")` }}
                />
              )}
            </div>
          </div>
          <div className="flex h-[1cqw] overflow-hidden rounded-full opacity-80">
            <span className="flex-[5] bg-current opacity-80" />
            <span className="flex-[2] bg-current opacity-50" />
            <span className="flex-[2] bg-current opacity-25" />
            <span className="flex-1 bg-current opacity-10" />
          </div>
        </div>
        <p className="m-0 text-sm text-ink-3">{light ? t('darkBackground') : t('coverNote')}</p>
      </aside>
    </div>
  );
}
