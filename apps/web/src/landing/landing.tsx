import { getTranslations } from 'next-intl/server';
import { MAIN_ID } from '../components/skip-link-id';
import { Atelier } from './atelier';
import { listExamples } from './example-source';
import { FinalCta, Guarantees, Method } from './home-sections';
import { PillLink } from './pill-link';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

// Home of the product: a server component. Only the atelier (a live preview with its own state) is a client
// leaf. The sheets it shows come from the studio's renderers, the single source of rendering.
export async function Landing() {
  const t = await getTranslations('homePage');
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <SiteHeader onHome />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <section className="mx-auto grid max-w-[1240px] gap-10 px-6 pt-16 pb-14 lg:grid-cols-12 lg:items-end lg:pt-24 lg:pb-20">
          <h1 className="m-0 font-display text-5xl leading-[0.92] font-extrabold tracking-[-0.04em] text-balance lg:col-span-8">
            {t('hero.title')}
          </h1>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <p className="m-0 max-w-[48ch] text-lg text-ink-2">{t('hero.lead')}</p>
            <div className="flex flex-wrap gap-3">
              <PillLink href="/start">{t('hero.start')}</PillLink>
              <PillLink href="/inscription" variant="secondary">
                {t('hero.signup')}
              </PillLink>
            </div>
            <p className="m-0 text-sm text-ink-3">{t('hero.note')}</p>
          </div>
        </section>

        <section id="atelier" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 pb-20">
          <div className="mb-8 flex max-w-[60ch] flex-col gap-3">
            <h2 className="m-0 font-display text-3xl leading-[1.05] font-bold tracking-tight text-balance">
              {t('atelier.title')}
            </h2>
            <p className="m-0 text-base text-ink-2">{t('atelier.lead')}</p>
          </div>
          <Atelier examples={listExamples()} />
        </section>

        <Method />
        <Guarantees />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
