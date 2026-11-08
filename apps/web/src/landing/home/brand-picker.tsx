'use client';

import { useTranslations } from 'next-intl';
import { useBrand } from './brand-context';

/** Switch of the example brand: a native radio group drawn as logo chips; the whole page follows. */
export function BrandPicker() {
  const t = useTranslations('homePage.hero');
  const { examples, example, select } = useBrand();
  return (
    <fieldset className="m-0 mx-auto mt-10 flex max-w-[900px] min-w-0 flex-col items-center gap-3 border-0 p-0 px-5">
      <legend className="mb-3 w-full text-center font-mono text-xs text-ink-3">{t('pick')}</legend>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {examples.map((entry) => (
          <label
            key={entry.id}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink has-checked:border-ink has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name="hero-brand"
              value={entry.id}
              checked={entry.id === example.id}
              onChange={() => {
                select(entry.id);
              }}
              className="sr-only"
            />
            <img src={entry.logo} alt="" className="size-6 rounded-sm object-contain" />
            {entry.name}
          </label>
        ))}
      </div>
      <p className="m-0 text-xs text-ink-3">{t('fiction')}</p>
    </fieldset>
  );
}
