import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

/** Six real objections, answered in the page itself (native disclosure: keyboard and screen readers for free). */
export async function Faq() {
  const t = await getTranslations('homePage.faq');
  return (
    <section
      id="questions"
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-[1240px] gap-10 px-6 py-24 sm:py-32 lg:grid-cols-12"
    >
      <h2
        id="faq-title"
        className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.03em] text-balance lg:col-span-4"
      >
        {t('title')}
      </h2>
      <div className="flex flex-col lg:col-span-8">
        {QUESTIONS.map((key) => (
          <details key={key} className="group border-t border-line py-5 last:border-b">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 font-display text-xl font-bold tracking-tight [&::-webkit-details-marker]:hidden">
              <h3 className="m-0 text-xl font-bold">{t(`${key}.q`)}</h3>
              <Plus
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45"
              />
            </summary>
            <p className="mt-3 mb-0 max-w-[62ch] text-base text-ink-2">{t(`${key}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
