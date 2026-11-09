'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useBrand } from './brand-context';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;

/** Choice of the example brand (native radios, drawn as chips): the whole page follows it. */
export function BrandChips({ group }: { readonly group: string }) {
  const t = useTranslations('homePage.inside');
  const { examples, example, select } = useBrand();
  return (
    <fieldset className="no-scrollbar m-0 -mx-4 flex min-w-0 gap-2 overflow-x-auto border-0 p-0 px-4">
      <legend className="sr-only">{t('pick')}</legend>
      {examples.map((entry) => {
        const on = entry.id === example.id;
        return (
          <label
            key={entry.id}
            className={`relative flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${on ? 'border-transparent' : 'border-line'}`}
          >
            <input
              type="radio"
              name={`brand-${group}`}
              value={entry.id}
              checked={on}
              onChange={() => {
                select(entry.id);
              }}
              className="sr-only"
            />
            {on ? (
              <motion.span
                layoutId={`brand-chip-${group}`}
                className="absolute inset-0 rounded-full bg-accent"
                transition={SOFT}
              />
            ) : null}
            <img
              src={entry.logo}
              alt=""
              className="relative size-6 rounded-md bg-preview object-contain p-0.5"
            />
            <span className={`relative ${on ? 'text-on-accent' : 'text-ink'}`}>{entry.name}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
