import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const PROMISES = ['logo', 'measured', 'undo', 'export'] as const;

/** The verifiable promises as a slow ribbon: no press logos, no figures, only what the repository proves. */
export async function PromiseMarquee() {
  const t = await getTranslations('homePage.promise');
  const strip = [...PROMISES, ...PROMISES];
  return (
    <section aria-label={t('label')} className="overflow-clip border-y border-line bg-surface py-5">
      <ul className="marquee m-0 flex w-max list-none gap-10 p-0 pr-10">
        {strip.map((key, index) => (
          <li
            key={`${key}-${String(index)}`}
            aria-hidden={index >= PROMISES.length ? true : undefined}
            className="flex items-center gap-3 font-mono text-sm whitespace-nowrap"
          >
            <Check aria-hidden="true" className="size-4 text-success" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}
