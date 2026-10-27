import type { ComponentPropsWithoutRef } from 'react';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  readonly variant?: 'primary' | 'secondary';
};

const VARIANTS = {
  // Text on --accent is only ever --accent-contrast (09 §2).
  primary: 'bg-accent text-on-accent hover:opacity-90',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-elevated',
} as const;

/** One primary action per screen (09 §1.4). Minimum target 44 px (§5). */
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
