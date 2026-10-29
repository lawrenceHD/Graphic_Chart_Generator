'use client';

import { Braces, FileCode2, FileText, Image as ImageIcon, Palette, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';
import type { BrandView } from './brand-view';
import { cssTokens, download, dtcgTokens, fileStem, tailwindTheme } from './export-files';

// Export (09 §7 ExportDialog): a native <dialog> (focus trap, Escape, inert page) with the files a designer
// or a developer takes away. The PDF is the browser's print of the same sheets the canvas shows.
function Row({
  icon,
  title,
  detail,
  children,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly detail: string;
  readonly children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-elevated text-ink-2">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-3">{detail}</span>
      </span>
      <span className="flex shrink-0 gap-1.5">{children}</span>
    </li>
  );
}

const action =
  'inline-flex h-9 items-center rounded-full border border-line-strong px-3.5 text-xs font-medium text-ink transition-colors hover:bg-elevated';

export function ExportDialog({
  open,
  view,
  onClose,
  onPrint,
}: {
  readonly open: boolean;
  readonly view: BrandView | null;
  readonly onClose: () => void;
  readonly onPrint: () => void;
}) {
  const t = useTranslations('workspace.exporting');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (node === null) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const stem = view === null ? 'brand' : fileStem(view.name);
  const logos =
    view === null
      ? []
      : ([
          ['color', view.logo.color],
          ['mono-black', view.logo['mono-black']],
          ['mono-white', view.logo['mono-white']],
          ['favicon', view.logo.favicon],
        ] as const);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="export-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_-20px_oklch(0.2_0.01_60/0.45)] backdrop:bg-[oklch(0.2_0.01_60/0.35)] backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <h2 id="export-title" className="m-0 font-display text-2xl font-bold tracking-tight">
            {t('title')}
          </h2>
          <p className="m-0 mt-1 text-sm text-ink-2">{t('lead')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-elevated hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      {view === null ? null : (
        <ul className="m-0 list-none px-6 pt-2 pb-5">
          <Row
            icon={<FileText aria-hidden="true" className="size-5" />}
            title={t('pdf')}
            detail={t('pdfDetail')}
          >
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-xs font-semibold text-on-accent"
              onClick={() => {
                onClose();
                onPrint();
              }}
            >
              {t('pdfAction')}
            </button>
          </Row>
          <Row
            icon={<ImageIcon aria-hidden="true" className="size-5" />}
            title={t('logos')}
            detail={t('logosDetail')}
          >
            {logos.map(([kind, url]) =>
              url === null ? null : (
                <a key={kind} href={url} download={`${stem}-${kind}`} className={action}>
                  {t(`logo.${kind}`)}
                </a>
              ),
            )}
          </Row>
          <Row
            icon={<Palette aria-hidden="true" className="size-5" />}
            title={t('css')}
            detail={t('cssDetail')}
          >
            <button
              type="button"
              className={action}
              onClick={() => {
                download(`${stem}-tokens.css`, cssTokens(view), 'text/css');
              }}
            >
              CSS
            </button>
            <button
              type="button"
              className={action}
              onClick={() => {
                download(`${stem}-tailwind.css`, tailwindTheme(view), 'text/css');
              }}
            >
              Tailwind
            </button>
          </Row>
          <Row
            icon={<Braces aria-hidden="true" className="size-5" />}
            title={t('figma')}
            detail={t('figmaDetail')}
          >
            <button
              type="button"
              className={action}
              onClick={() => {
                download(`${stem}-tokens.json`, dtcgTokens(view), 'application/json');
              }}
            >
              JSON
            </button>
          </Row>
          <li className="flex items-center gap-2 pt-3 text-xs text-ink-3">
            <FileCode2 aria-hidden="true" className="size-3.5" />
            {t('note')}
          </li>
        </ul>
      )}
    </dialog>
  );
}
