import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReduce } from '../lib/motion-pref';
import { reveal } from '../lib/motion';

// Shared effects of the prototype. All of them move transform / opacity only and switch off with the motion
// preference (useReduce).

/** 3D tilt following the pointer (mouse only: touch keeps the card still and readable). */
export function Tilt({
  children,
  className = '',
  max = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  style?: CSSProperties;
}) {
  const reduce = useReduce();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), {
    stiffness: 220,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), {
    stiffness: 220,
    damping: 18,
  });
  const glareX = useTransform(px, [-0.5, 0.5], ['0%', '100%']);
  const glare = useTransform(
    glareX,
    (x) => `radial-gradient(circle at ${x} 20%, rgb(255 255 255 / 0.28), transparent 55%)`,
  );
  return (
    <motion.div
      className={`relative ${className}`}
      style={{
        ...style,
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 900,
      }}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width - 0.5);
        py.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glare }}
        />
      )}
    </motion.div>
  );
}

/** Number counting up when it scrolls into view. */
export function Counter({
  to,
  suffix = '',
  className = '',
}: {
  to: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const reduce = useReduce();
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {value}
      {suffix}
    </span>
  );
}

/** Button or link drawn towards the pointer, then springing back. */
export function Magnetic({
  children,
  className = '',
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReduce();
  const x = useSpring(0, { stiffness: 260, damping: 16 });
  const y = useSpring(0, { stiffness: 260, damping: 16 });
  return (
    <motion.div
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * strength);
        y.set((event.clientY - rect.top - rect.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Words rising one after the other from behind a mask. Screen readers get the plain sentence. The whole line
 *  is observed: each word starts clipped by its mask, so observing the words themselves would never fire. */
export function SplitWords({
  text,
  className = '',
  delay = 0,
  step = 0.06,
}: {
  text: string;
  className?: string;
  delay?: number;
  step?: number;
}) {
  const reduce = useReduce();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' });
  const words = text.split(' ');
  return (
    <span ref={ref} className={className} aria-label={text} role="text">
      {words.map((word, index) => (
        <span
          key={index}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.1em] align-bottom"
        >
          <motion.span
            className="inline-block will-change-transform"
            initial={reduce ? { opacity: 0 } : { y: '110%', rotate: 4 }}
            animate={inView ? (reduce ? { opacity: 1 } : { y: 0, rotate: 0 }) : undefined}
            transition={
              reduce
                ? { duration: 0.1 }
                : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: delay + index * step }
            }
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Ambient bobbing (CSS keyframes, paused with the motion preference). */
export function Float({
  children,
  className = '',
  delay = 0,
  duration = 6,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`float ${className}`}
      style={{
        ...style,
        animationDelay: `${String(-delay)}s`,
        animationDuration: `${String(duration)}s`,
      }}
    >
      {children}
    </div>
  );
}
