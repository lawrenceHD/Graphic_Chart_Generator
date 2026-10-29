'use client';

import { ArrowLeft, Download, Redo2, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeSwitch } from '../../ui/preferences';
import type { Phase } from './use-studio';

export function IconButton({
  label,
  children,
  onClick,
  disabled = false,
  pressed,
  className = '',
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly pressed?: boolean;
  readonly className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.92 }}
      className={`grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-elevated hover:text-ink disabled:pointer-events-none disabled:opacity-35 aria-pressed:bg-elevated aria-pressed:text-ink ${className}`}
    >
      {children}
    </motion.button>
  );
}

function ProgressPill({ phase, done }: { readonly phase: Phase; readonly done: number }) {
  const t = useTranslations('workspace.progress');
  const ratio = phase === 'ready' ? 1 : done / 4;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const label =
    phase === 'ready'
      ? t('ready')
      : phase === 'analysing' || phase === 'starting'
        ? t('step', { done: Math.min(done + 1, 4) })
        : phase === 'sending' || phase === 'scanning'
          ? t('checking')
          : phase === 'failed'
            ? t('failed')
            : phase === 'loading'
              ? t('loading')
              : t('waiting');
  return (
    <div className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface pr-3.5 pl-1.5 text-xs text-ink-2 md:flex">
      <svg viewBox="0 0 24 24" className="size-7 -rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
        <motion.circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={phase === 'ready' ? 'var(--success)' : 'var(--text-primary)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export function TopBar({
  name,
  sector,
  logo,
  phase,
  done,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
}: {
  readonly name: string;
  readonly sector: string | null;
  readonly logo: string | null;
  readonly phase: Phase;
  readonly done: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onExport: () => void;
}) {
  const t = useTranslations('workspace');
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas px-2 sm:px-3">
      <Link
        href="/"
        aria-label={t('home')}
        title={t('home')}
        className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
      </Link>
      <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-preview">
        {logo === null ? null : (
          <img src={logo} alt="" className="size-6 object-contain" draggable={false} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate text-sm leading-tight font-semibold">{name}</h1>
        <p className="m-0 truncate text-xs text-ink-3">{sector ?? t('guideline')}</p>
      </div>
      <ProgressPill phase={phase} done={done} />
      <div className="flex items-center gap-0.5">
        <IconButton label={t('undo')} onClick={onUndo} disabled={!canUndo}>
          <Undo2 aria-hidden="true" className="size-[18px]" />
        </IconButton>
        <IconButton label={t('redo')} onClick={onRedo} disabled={!canRedo}>
          <Redo2 aria-hidden="true" className="size-[18px]" />
        </IconButton>
      </div>
      <ThemeSwitch className="hidden sm:flex" />
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onExport}
        disabled={phase !== 'ready'}
        className="flex h-10 items-center gap-2 rounded-full bg-accent px-3.5 text-sm font-semibold text-on-accent transition-opacity disabled:opacity-40 sm:px-5"
      >
        <Download aria-hidden="true" className="size-4" />
        <span className="max-sm:sr-only">{t('export')}</span>
      </motion.button>
    </header>
  );
}
