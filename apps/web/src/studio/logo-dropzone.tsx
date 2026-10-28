'use client';

import type { AssetErrorCode } from '@app/contracts';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '../components/button';
import { LOGO_FILE_HEAD_BYTES, checkLogoFile } from './logo-file';

// Dropzone of the studio mock-up (prototypes/studio, Start.tsx `Drop`): drag and drop, or a real button
// for keyboard and touch (09 §7). The pre-check spares a round trip; the server scan stays the authority.
const ACCEPT = '.svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg';

async function readHead(file: File): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await file.slice(0, LOGO_FILE_HEAD_BYTES).arrayBuffer());
  } catch {
    return null; // unreadable file (moved, permissions): reported as damaged below
  }
}

export function LogoDropzone({
  onAccept,
  rejection,
  disabled = false,
}: {
  readonly onAccept: (file: File) => void;
  /** Verdict of the server scan for the last file sent. */
  readonly rejection?: AssetErrorCode | undefined;
  readonly disabled?: boolean;
}) {
  const t = useTranslations('dropzone');
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [local, setLocal] = useState<AssetErrorCode | null>(null);

  const take = async (file: File | undefined): Promise<void> => {
    if (file === undefined || disabled) return;
    const head = await readHead(file);
    const checked = head === null ? null : checkLogoFile(file.size, head);
    if (checked === null || !checked.ok) {
      setLocal(checked === null ? 'ASSET_DECODE_FAILED' : checked.error);
      return;
    }
    setLocal(null);
    onAccept(file);
  };
  const error = local ?? rejection;

  return (
    <div className="flex flex-col gap-3">
      <div
        data-testid="logo-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => {
          setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void take(event.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-4 rounded-[22px] border-2 border-dashed px-5 py-10 text-center transition-colors motion-reduce:transition-none ${over ? 'border-accent bg-elevated' : 'border-line-strong'}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-8 text-ink-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 15V4 M7.5 8.5 12 4l4.5 4.5 M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <div>
          <p className="m-0 text-lg font-semibold text-ink">{t('label')}</p>
          <p className="m-0 mt-1 text-sm text-ink-2">{t('hint')}</p>
        </div>
        <Button
          variant="secondary"
          className="rounded-full px-5"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {t('choose')}
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          aria-label={t('choose')}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            void take(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      {error !== undefined ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
