'use client';

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { MockupStage } from '../../studio/mockups/mockup-stage';
import { DemoSheet } from '../demo-sheet';
import { useBrand } from './brand-context';
import { HeroProofs } from './hero-proofs';

const SHEET = 'overflow-hidden rounded-md bg-surface shadow-2xl ring-1 ring-line';

function Layer({
  className,
  rotate,
  lift,
  progress,
  children,
}: {
  readonly className: string;
  readonly rotate: number;
  /** Scroll distance (px) the layer rises while the hero leaves: depth without a single repaint. */
  readonly lift: number;
  readonly progress: MotionValue<number>;
  readonly children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const y = useTransform(progress, [0, 1], [0, reduce ? 0 : -lift]);
  return (
    <motion.div className={`absolute ${className}`} style={{ y, rotate }}>
      {children}
    </motion.div>
  );
}

/** Real pages and a real mockup, composed by the product's own renderers, fanned out like proofs on a table. */
export function HeroStage() {
  const { example, view } = useBrand();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end start'] });
  return (
    <div ref={ref} className="relative mx-auto mt-10 w-full max-w-[1120px] px-4 sm:px-6">
      <motion.div
        key={example.id}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[1/0.78] w-full sm:aspect-[16/9.4]"
      >
        <Layer
          className="top-[8%] left-0 hidden w-[40%] sm:block"
          rotate={-7}
          lift={40}
          progress={scrollYProgress}
        >
          <div className={SHEET}>
            <DemoSheet type="palette" exampleId={example.id} />
          </div>
        </Layer>
        <Layer
          className="top-[8%] right-0 hidden w-[40%] sm:block"
          rotate={6}
          lift={70}
          progress={scrollYProgress}
        >
          <div className={SHEET}>
            <DemoSheet type="typography" exampleId={example.id} />
          </div>
        </Layer>
        <Layer
          className="top-0 left-[4%] z-10 w-[92%] sm:left-[21%] sm:w-[58%]"
          rotate={0}
          lift={20}
          progress={scrollYProgress}
        >
          <div className={SHEET}>
            <DemoSheet type="cover" exampleId={example.id} />
          </div>
        </Layer>
        <Layer
          className="right-[2%] bottom-[2%] z-20 w-[46%] sm:right-[5%] sm:w-[27%]"
          rotate={3}
          lift={110}
          progress={scrollYProgress}
        >
          <div className="overflow-hidden rounded-lg bg-surface shadow-2xl ring-1 ring-line">
            <MockupStage
              scene="mug-white"
              view={view}
              label={example.name}
              failedLabel=""
              retryLabel=""
            />
          </div>
        </Layer>
        <HeroProofs />
      </motion.div>
    </div>
  );
}
