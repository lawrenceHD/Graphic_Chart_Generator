'use client';

import { useEffect, useState } from 'react';
import { MAIN_ID } from '../components/skip-link-id';
import { BackToTop, Hero, Nav } from './landing-hero';
import {
  Faq,
  Facts,
  FinalCta,
  Footer,
  Inside,
  Journey,
  Manifesto,
  Mockups,
  PinnedPages,
  SystemGraph,
} from './landing-sections';

// Landing of the mock-up validated by the owner (prototypes/studio, Landing.tsx), on real material: every page
// and mockup shown is drawn by the studio's renderers from the La Mèza example (demo.ts).
export function Landing() {
  // The hero paints first; the rest of the page (a long scroll of sheets and photographs) mounts after the
  // first frame, so the headline is never held back by below-the-fold work.
  const [rest, setRest] = useState(false);
  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        setRest(true);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <Nav />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <Hero />
        {rest ? (
          <>
            <Facts />
            <Manifesto />
            <SystemGraph />
            <Journey />
            <PinnedPages />
            <Inside />
            <Mockups />
            <Faq />
            <FinalCta />
          </>
        ) : null}
      </main>
      {rest ? (
        <>
          <Footer />
          <BackToTop />
        </>
      ) : null}
    </div>
  );
}
