import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-ink-2',
};

// Simple geometric icons: the shape differs per state, so colour is never the only signal (09 §5).
const ICON_PATH: Record<Tone, string> = {
  success: 'M4 10.5 8 14.5 16 6',
  warning: 'M10 3 18 17H2Z M10 8v4 M10 14.5v.5',
  danger: 'M5 5l10 10 M15 5 5 15',
  info: 'M10 2a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M10 9v5 M10 6v.5',
};

/** State = icon + text + colour. Blocking errors are announced assertively, others politely. */
export async function StatusMessage({
  tone,
  children,
}: {
  readonly tone: Tone;
  readonly children: ReactNode;
}) {
  const t = await getTranslations('status');
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-2 text-sm ${TONE_CLASS[tone]}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICON_PATH[tone]} />
      </svg>
      <span>
        <span className="font-semibold">
          {t(tone)}
          {t('separator')}
        </span>
        {children}
      </span>
    </p>
  );
}
