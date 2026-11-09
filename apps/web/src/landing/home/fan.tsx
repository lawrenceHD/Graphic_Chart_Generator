'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useRef } from 'react';
import { Float } from '../../ui/fx';
import { DemoSheet } from '../demo-sheet';
import { useBrand } from './brand-context';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;

function FanCard({
  exampleId,
  offset,
  spread,
  index,
}: {
  readonly exampleId: string;
  readonly offset: number;
  readonly spread: MotionValue<number>;
  readonly index: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const x = useTransform(spread, (s) => `calc(-50% + ${String(offset * 40 * s)}%)`);
  const rotate = useTransform(spread, (s) => offset * 7 * s);
  const y = useTransform(spread, (s) => Math.abs(offset) * 24 * s);
  return (
    <motion.div
      className="absolute bottom-0 left-1/2 w-[min(64vw,420px)] origin-bottom"
      style={{ x, rotate, y, zIndex: 10 - Math.abs(offset) }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 180, scale: 0.85 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={reduce ? { duration: 0.1 } : { ...SOFT, delay: 0.4 + Math.abs(offset) * 0.12 }}
        whileHover={reduce ? {} : { y: -34, scale: 1.04, transition: SOFT }}
      >
        <Float delay={index * 1.3} duration={8}>
          <div className="overflow-hidden rounded-[22px] bg-surface shadow-[0_40px_70px_-40px_rgb(0_0_0/0.6)] ring-1 ring-line">
            <DemoSheet type="cover" exampleId={exampleId} />
          </div>
        </Float>
      </motion.div>
    </motion.div>
  );
}

/** The example brands' covers fanning out of a stack; scrolling opens the fan wider. */
export function Fan() {
  const reduce = useReducedMotion() ?? false;
  const { examples } = useBrand();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const spread = useSpring(useTransform(scrollYProgress, [0.1, 0.6], [0.55, 1.1]), {
    stiffness: 70,
    damping: 20,
  });
  const fixed = useMotionValue(1);
  const shown = examples.slice(0, 5);
  const middle = (shown.length - 1) / 2;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative mx-auto mt-16 h-[min(80vw,420px)] max-w-5xl sm:h-[420px]"
    >
      {shown.map((example, index) => (
        <FanCard
          key={example.id}
          exampleId={example.id}
          offset={index - middle}
          spread={reduce ? fixed : spread}
          index={index}
        />
      ))}
    </div>
  );
}
