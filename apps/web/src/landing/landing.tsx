import { MAIN_ID } from '../components/skip-link-id';
import { listExamples } from './example-source';
import { BackToTop } from './home/back-to-top';
import { BrandProvider } from './home/brand-context';
import { Deferred } from './home/deferred';
import { FinalCta } from './home/final-cta';
import { Faq } from './home/faq';
import { FlowGraph } from './home/flow-graph';
import { Hanging } from './home/hanging';
import { Hero } from './home/hero';
import { HomeFooter } from './home/home-footer';
import { Inside } from './home/inside';
import { Journey } from './home/journey';
import { LogoWallStrip } from './home/logo-wall-strip';
import { Manifesto } from './home/manifesto';
import { Metrics } from './home/metrics';
import { Showcase } from './home/showcase';
import { SiteHeader } from './site-header';

// Home of the product: a server shell around one client island that shares the chosen example brand between
// its sections. Every page and mockup it shows is drawn by the studio's own renderers (single source).
export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <SiteHeader onHome />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <BrandProvider examples={listExamples()}>
          <Hero />
          <Deferred>
            <LogoWallStrip />
            <Metrics />
            <Manifesto />
            <FlowGraph />
            <Journey />
            <Hanging />
            <Inside />
            <Showcase />
            <Faq />
            <FinalCta />
            <BackToTop />
          </Deferred>
        </BrandProvider>
      </main>
      <HomeFooter />
    </div>
  );
}
