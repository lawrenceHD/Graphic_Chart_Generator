import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';

type PillLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  readonly variant?: 'primary' | 'secondary' | 'quiet';
};

const VARIANTS = {
  // Text on --accent is only ever --accent-contrast (09 §2). One primary per screen.
  primary: 'bg-accent text-on-accent hover:opacity-90 active:opacity-80',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-elevated active:bg-elevated',
  quiet: 'text-ink-2 hover:bg-elevated hover:text-ink',
} as const;

/** A link drawn as the pill button of DESIGN.md: 44 px target, ink on paper. */
export function PillLink({ variant = 'primary', className = '', ...props }: PillLinkProps) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium whitespace-nowrap no-underline transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
