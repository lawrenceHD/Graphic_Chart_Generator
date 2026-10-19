import {
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from 'motion/react';

// docs/09_DESIGN_SYSTEM.md §4: one spring, one fade; transform and opacity only.
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 };
export const softSpring: Transition = { type: 'spring', stiffness: 160, damping: 22, mass: 0.9 };
export const fade: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };
export const reveal: Transition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] };

/** Entrance: 12 px rise + fade; under reduced motion, fade only (taste/motion-choreography). */
export function useRise(delay = 0): {
  initial: TargetAndTransition;
  whileInView: TargetAndTransition;
  viewport: { once: boolean; margin: string };
  transition: Transition;
} {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px' },
    transition: reduce ? { duration: 0.1 } : { ...reveal, delay },
  };
}

export const stagger = (step = 0.06): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: step } },
});
export const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: reveal },
};
export const itemReduced: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.1 } },
};
