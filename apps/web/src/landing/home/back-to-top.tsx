'use client';

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;

/** Floating "back to top", shown once the hero is passed; its ring is the reading progress. */
export function BackToTop() {
  const t = useTranslations('homePage.footer');
  const reduce = useReducedMotion() ?? false;
  const { scrollY, scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    setShown(y > window.innerHeight * 0.9);
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <AnimatePresence>
      {shown ? (
        <motion.button
          type="button"
          aria-label={t('toTop')}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
          }}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={reduce ? {} : { y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={SOFT}
          className="fixed right-5 z-50 grid size-14 cursor-pointer place-items-center rounded-full bg-accent text-on-accent shadow-[0_18px_40px_-16px_rgb(0_0_0/0.5)]"
          style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 56 56"
            className="absolute inset-0 size-full -rotate-90"
          >
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="3"
            />
            <motion.circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp className="size-5" aria-hidden="true" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
