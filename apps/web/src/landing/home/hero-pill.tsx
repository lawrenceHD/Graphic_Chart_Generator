'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useBrand } from './brand-context';
import { colorOf, inkOn } from './palette-tools';

const WordsSchema = z.array(z.string()).min(1);
const EASE = [0.16, 1, 0.3, 1] as const;

/** The word the logo becomes, cycling in a pill painted with each example brand's own colour. */
export function HeroPill() {
  const t = useTranslations('homePage.hero');
  const reduce = useReducedMotion() ?? false;
  const { examples } = useBrand();
  const words = WordsSchema.parse(t.raw('words'));
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, 2400);
    return () => {
      clearInterval(timer);
    };
  }, [reduce, words.length]);
  const source = examples[index % examples.length];
  const background = source === undefined ? '' : colorOf(source, 'primary');
  const color = source === undefined ? '' : inkOn(source, background);
  return (
    <motion.span
      aria-hidden="true"
      layout
      className="relative mx-[0.08em] inline-flex -rotate-2 overflow-hidden rounded-[0.4em] px-[0.24em] align-baseline"
      animate={{ backgroundColor: background, color }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

