import { animate, motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react';
import type React from 'react';
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
    (x) => `radial-gradient(circle at ${x} 20%, rgb(255 255 255 / 0.14), transparent 55%)`,
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
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
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

// One IntersectionObserver for every reveal on the page: it only toggles a class, CSS does the motion.
const watchers = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | undefined;
function watch(node: Element, onEnter: () => void): () => void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        watchers.get(entry.target)?.();
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  watchers.set(node, onEnter);
  observer.observe(node);
  return () => observer?.unobserve(node);
}

function useRevealed<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    return node ? watch(node, () => setShown(true)) : undefined;
  }, []);
  return [ref, shown];
}

/** Block fading and rising into place when it enters the viewport (CSS transition). */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, shown] = useRevealed<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ ['--d' as string]: `${String(delay)}s` }}
    >
      {children}
    </div>
  );
}

/** Words rising one after the other from behind a mask. Screen readers get the plain sentence. */
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
  const [ref, shown] = useRevealed<HTMLSpanElement>();
  const words = text.split(' ');
  return (
    <span
      ref={ref}
      className={`${shown ? 'is-in' : ''} ${className}`}
      aria-label={text}
      role="text"
    >
      {words.map((word, index) => (
        <span
          key={index}
          aria-hidden
          className="inline-block overflow-hidden pb-[0.1em] align-bottom"
        >
          <span className="word" style={{ ['--d' as string]: `${String(delay + index * step)}s` }}>
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </span>
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
