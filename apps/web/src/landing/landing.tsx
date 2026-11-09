import { MAIN_ID } from '../components/skip-link-id';
import { listExamples } from './example-source';
import { AtelierSection } from './home/atelier-section';
import { BrandProvider } from './home/brand-context';
import { Faq } from './home/faq';
import { Hero } from './home/hero';
import { MockupWall } from './home/mockup-wall';
import { Outputs } from './home/outputs';
import { Problem } from './home/problem';
import { PromiseMarquee } from './home/promise-marquee';
import { Proof } from './home/proof';
import { Story } from './home/story';
import { FinalCta } from './home-sections';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

// Home of the product: a server shell around one client island that shares the chosen example brand between
// its sections. Every sheet and mockup it shows is drawn by the studio's own renderers (single source).
export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <SiteHeader onHome />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <BrandProvider examples={listExamples()}>
          <Hero />
          <PromiseMarquee />
          <Problem />
          <Story />
          <MockupWall />
          <Proof />
          <AtelierSection />
          <Outputs />
        </BrandProvider>
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
