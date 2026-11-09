'use client';

import { LOGO_ROLES, MAX_LOGOS_PER_PROJECT, type AssetErrorCode, type LogoRole } from '@app/contracts';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/button';
import {
  addLogo,
  removeLogo,
  setDocument,
  setPrimary,
  setRole,
  type BrandInputs,
} from './brand-inputs-model';
import { LogoDropzone } from './logo-dropzone';

// Several logos and a document, one drop zone (drag and drop or keyboard). Each logo shows its preview, may
// be the primary, and otherwise carries a role the person can correct. Controlled: the parent owns `value`.
const randomId = (): string => crypto.randomUUID();
// Variants first; "primary" on a non-primary logo means another version of the main logo.
const ROLE_OPTIONS: readonly LogoRole[] = [
  ...LOGO_ROLES.filter((role) => role !== 'primary'),
  'primary',
];

function usePreviews(files: readonly { readonly id: string; readonly file: File }[]) {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    const made = new Map(files.map(({ id, file }) => [id, URL.createObjectURL(file)]));
    setUrls(made);
    return () => {
      for (const url of made.values()) URL.revokeObjectURL(url);
    };
  }, [files]);
  return urls;
}

export function BrandInputsPanel({
  value,
  onChange,
  disabled = false,
  rejection,
  newId = randomId,
}: {
  readonly value: BrandInputs;
  readonly onChange: (next: BrandInputs) => void;
  readonly disabled?: boolean;
  readonly rejection?: AssetErrorCode | undefined;
  readonly newId?: () => string;
}) {
  const t = useTranslations('brandInputs');
  const [full, setFull] = useState(false);
  const previews = usePreviews(value.logos);
  // Files of one drop arrive one after the other, possibly before React re-rendered: each is added to the
  // latest state, not to the one of the last render.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const commit = (next: BrandInputs): void => {
    latest.current = next;
    onChange(next);
  };

  const addOne = (file: File): void => {
    const added = addLogo(latest.current, file, newId);
    setFull(added.error === 'TOO_MANY_LOGOS');
    commit(added.state);
  };
  const addDocument = (file: File): void => {
    commit(setDocument(latest.current, file));
  };
  const update = (change: (current: BrandInputs) => BrandInputs): void => {
    setFull(false);
    commit(change(latest.current));
  };

  return (
    <div className="flex flex-col gap-4">
      <LogoDropzone
        onAccept={addOne}
        onAcceptDocument={addDocument}
        rejection={rejection}
        disabled={disabled}
      />
      {full ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {t('tooMany', { max: MAX_LOGOS_PER_PROJECT })}
        </p>
      ) : null}

      {value.logos.length === 0 ? null : (
        <section aria-label={t('logosTitle', { count: value.logos.length, max: MAX_LOGOS_PER_PROJECT })}>
          <h3 className="m-0 mb-2 text-sm font-semibold text-ink-2">
            {t('logosTitle', { count: value.logos.length, max: MAX_LOGOS_PER_PROJECT })}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {value.logos.map((logo) => (
              <li
                key={logo.id}
                data-testid="logo-entry"
                className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line-strong bg-surface px-3 py-2"
              >
                <div
                  aria-hidden="true"
                  className="size-12 shrink-0 rounded-lg border border-line bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${previews.get(logo.id) ?? ''}")` }}
                />
                <p className="m-0 min-w-0 flex-1 truncate text-sm">{logo.file.name}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="primary-logo"
                    checked={logo.primary}
                    disabled={disabled}
                    onChange={() => {
                      update((current) => setPrimary(current, logo.id));
                    }}
                  />
                  <span>{t('primary')}</span>
                </label>
                {logo.primary ? null : (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">{t('roleOf', { name: logo.file.name })}</span>
                    <select
                      className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-sm"
                      value={logo.role}
                      disabled={disabled}
                      onChange={(event) => {
                        const role = LOGO_ROLES.find((candidate) => candidate === event.target.value);
                        if (role !== undefined) update((current) => setRole(current, logo.id, role));
                      }}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role === 'primary' ? t('roles.other') : t(`roles.${role}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Button
                  variant="secondary"
                  className="rounded-full"
                  disabled={disabled}
                  aria-label={t('remove', { name: logo.file.name })}
                  onClick={() => {
                    update((current) => removeLogo(current, logo.id));
                  }}
                >
                  {t('removeShort')}
                </Button>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 text-sm text-ink-2">{t('rolesHint')}</p>
        </section>
      )}

      {value.document === null ? null : (
        <section
          aria-label={t('documentTitle')}
          className="flex items-center justify-between gap-3 rounded-[14px] border border-line-strong bg-surface px-3 py-2"
        >
          <p className="m-0 min-w-0 truncate text-sm">
            <span className="font-semibold">{t('documentTitle')}</span> {value.document.name}
          </p>
          <Button
            variant="secondary"
            className="rounded-full"
            disabled={disabled}
            aria-label={t('remove', { name: value.document.name })}
            onClick={() => {
              update((current) => setDocument(current, null));
            }}
          >
            {t('removeShort')}
          </Button>
        </section>
      )}
    </div>
  );
}
