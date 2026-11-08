import { getTranslations } from 'next-intl/server';
import { MAIN_ID } from '../components/skip-link-id';
import { Atelier } from './atelier';
import { listExamples } from './example-source';
import { BrandProvider } from './home/brand-context';
import { Hero } from './home/hero';
import { FinalCta, Guarantees, Method } from './home-sections';
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
        <BrandProvider examples={listExamples()}>
          <Hero />
          <section id="atelier" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 pb-20">
            <div className="mb-8 flex max-w-[60ch] flex-col gap-3">
              <h2 className="m-0 font-display text-3xl leading-[1.05] font-bold tracking-tight text-balance">
                {t('atelier.title')}
              </h2>
              <p className="m-0 text-base text-ink-2">{t('atelier.lead')}</p>
            </div>
            <Atelier examples={listExamples()} />
          </section>
        </BrandProvider>

        <Method />
        <Guarantees />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
