'use client';

import type { AssetErrorCode } from '@app/contracts';
import { ok, type Result } from '@app/kernel';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '../components/button';
import { missingFonts, rasterizeSvg } from '../start/logo-image';
import { findLiveText } from '../start/svg-text';
import {
  LOGO_FILE_HEAD_BYTES,
  checkBrandFile,
  checkLogoFile,
  type BrandFileKind,
  type LogoFileType,
} from './logo-file';

// Dropzone of the studio mock-up (prototypes/studio, Start.tsx `Drop`): drag and drop, or a real button
// for keyboard and touch (09 §7). The pre-check spares a round trip; the server scan stays the authority.
const ACCEPT = '.svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg';
const ACCEPT_WITH_DOCUMENT = `${ACCEPT},.txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document`;

async function readHead(file: File): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await file.slice(0, LOGO_FILE_HEAD_BYTES).arrayBuffer());
  } catch {
    return null; // unreadable file (moved, permissions): reported as damaged below
  }
}

const MAX_FILES_PER_DROP = 12;
const asBrandFile = (
  checked: Result<LogoFileType, AssetErrorCode>,
): Result<BrandFileKind, AssetErrorCode> =>
  checked.ok ? ok({ kind: 'logo', type: checked.value }) : checked;

interface Refusal {
  readonly name: string;
  readonly code: AssetErrorCode;
}

export function LogoDropzone({
  onAccept,
  onAcceptDocument,
  rejection,
  disabled = false,
  convert = rasterizeSvg,
  findMissingFonts = missingFonts,
}: {
  readonly onAccept: (file: File) => void;
  /**
   * Several files may be dropped at once. A manifest document (txt, md, docx) is passed here; without it,
   * only logos are taken, as before.
   */
  readonly onAcceptDocument?: ((file: File) => void) | undefined;
  /** SVG with live text → PNG drawn with this computer's fonts (injected in tests). */
  readonly convert?: (file: File, svg: string) => Promise<File>;
  /** Fonts of the SVG absent from this computer: converting would draw substitutes. */
  readonly findMissingFonts?: (fonts: readonly string[]) => readonly string[];
  /** Verdict of the server scan for the last file sent. */
  readonly rejection?: AssetErrorCode | undefined;
  readonly disabled?: boolean;
}) {
  const t = useTranslations('dropzone');
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [refusals, setRefusals] = useState<readonly Refusal[]>([]);
  const [liveText, setLiveText] = useState<{
    readonly file: File;
    readonly svg: string;
    readonly fonts: readonly string[];
    readonly missing: readonly string[];
  } | null>(null);
  const [converting, setConverting] = useState(false);
  // Files of a drop that come after an SVG waiting for the person's answer about its live text.
  const waiting = useRef<readonly File[]>([]);
  const multiple = onAcceptDocument !== undefined;

  const refuse = (name: string, code: AssetErrorCode): void => {
    setRefusals((current) => [...current, { name, code }]);
  };

  /** Takes one file; true when it must wait for an answer (live text) before the next ones. */
  const takeOne = async (file: File, after: readonly File[]): Promise<boolean> => {
    const head = await readHead(file);
    if (head === null) {
      refuse(file.name, 'ASSET_DECODE_FAILED');
      return false;
    }
    const checked = multiple
      ? checkBrandFile(file.size, head)
      : asBrandFile(checkLogoFile(file.size, head));
    if (!checked.ok) {
      refuse(file.name, checked.error);
      return false;
    }
    if (checked.value.kind === 'document') {
      onAcceptDocument?.(file);
      return false;
    }
    if (checked.value.type === 'svg') {
      const svg = await file.text().catch(() => null);
      if (svg === null) {
        refuse(file.name, 'ASSET_DECODE_FAILED');
        return false;
      }
      const found = findLiveText(svg);
      if (found !== null) {
        waiting.current = after;
        setLiveText({ file, svg, fonts: found.fonts, missing: findMissingFonts(found.fonts) });
        return true;
      }
    }
    onAccept(file);
    return false;
  };

  const run = async (files: readonly File[]): Promise<void> => {
    for (const [index, file] of files.entries()) {
      if (await takeOne(file, files.slice(index + 1))) return;
    }
  };

  const take = async (list: FileList | null | undefined): Promise<void> => {
    if (list === null || list === undefined || disabled) return;
    const all = Array.from(list);
    const files = all.slice(0, multiple ? MAX_FILES_PER_DROP : 1);
    if (files.length === 0) return;
    waiting.current = [];
    setRefusals(
      all.slice(files.length).map((file) => ({ name: file.name, code: 'ASSET_TOO_LARGE' })),
    );
    setLiveText(null);
    await run(files);
  };

  const resume = (): void => {
    const rest = waiting.current;
    waiting.current = [];
    setLiveText(null);
    void run(rest);
  };

  const convertLiveText = async (): Promise<void> => {
    if (liveText === null) return;
    setConverting(true);
    try {
      const png = await convert(liveText.file, liveText.svg);
      onAccept(png);
    } catch {
      refuse(liveText.file.name, 'ASSET_DECODE_FAILED');
    } finally {
      setConverting(false);
      resume();
    }
  };
  const errors: readonly Refusal[] =
    rejection === undefined ? refusals : [...refusals, { name: '', code: rejection }];

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
          void take(event.dataTransfer.files);
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
          <p className="m-0 text-lg font-semibold text-ink">
            {multiple ? t('labelMany') : t('label')}
          </p>
          <p className="m-0 mt-1 text-sm text-ink-2">{multiple ? t('hintMany') : t('hint')}</p>
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
          accept={multiple ? ACCEPT_WITH_DOCUMENT : ACCEPT}
          multiple={multiple}
          aria-label={t('choose')}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            void take(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {liveText === null ? null : (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-line-strong bg-surface p-4"
        >
          <p className="m-0 font-semibold text-ink">
            {liveText.fonts.length > 0
              ? t('liveText.titleFonts', { fonts: liveText.fonts.join(', ') })
              : t('liveText.title')}
          </p>
          <p className="m-0 text-sm text-ink-2">{t('liveText.advice')}</p>
          {liveText.missing.length > 0 ? (
            <p className="m-0 text-sm font-medium text-warning">
              {t('liveText.missing', { fonts: liveText.missing.join(', ') })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                resume();
                input.current?.click();
              }}
            >
              {t('liveText.other')}
            </Button>
            <Button
              variant={liveText.missing.length > 0 ? 'secondary' : 'primary'}
              disabled={converting}
              onClick={() => void convertLiveText()}
            >
              {converting
                ? t('liveText.converting')
                : liveText.missing.length > 0
                  ? t('liveText.convertAnyway')
                  : t('liveText.convert')}
            </Button>
          </div>
        </div>
      )}
      {errors.length > 0 ? (
        <ul role="alert" className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-danger">
          {errors.map((refusal, index) => (
            <li key={`${refusal.name}-${String(index)}`}>
              {refusal.name === '' ? '' : `${refusal.name} : `}
              {t(`errors.${refusal.code}`)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
