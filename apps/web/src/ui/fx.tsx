'use client';

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

// Effects of the landing (ported from prototypes/studio, components/fx.tsx). They move transform, opacity and
// blur only, and stand still under prefers-reduced-motion (motion's useReducedMotion, CSS in motion.css).
type Vars = CSSProperties & Partial<Record<'--d' | '--r', string>>;

/** 3D tilt following the pointer (mouse only: on touch the card stays still and readable). */
export function Tilt({
  children,
  className = '',
  max = 8,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly max?: number;
}) {
  const reduce = useReducedMotion() ?? false;
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
    (x) => `radial-gradient(circle at ${x} 20%, oklch(1 0 0 / 0.16), transparent 55%)`,
  );
  return (
    <motion.div
      className={`relative ${className}`}
      style={{
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
      {reduce ? null : (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glare }}
        />
      )}
    </motion.div>
  );
}

/** Number counting up once it scrolls into view. */
export function Counter({
  to,
  className = '',
}: {
  readonly to: number;
  readonly className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const reduce = useReducedMotion() ?? false;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (current) => {
        setValue(Math.round(current));
      },
    });
    return () => {
      controls.stop();
    };
  }, [inView, reduce, to]);
  return (
    <span ref={ref} className={`tabular ${className}`}>
      {value}
    </span>
  );
}

/** A call to action drawn towards the pointer, springing back when it leaves. */
export function Magnetic({
  children,
  className = '',
  strength = 0.28,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly strength?: number;
}) {
  const reduce = useReducedMotion() ?? false;
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

// One IntersectionObserver for every reveal of the page: it only toggles a class, CSS does the motion.
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
  return () => {
    observer?.unobserve(node);
  };
}

function useRevealed<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    return node === null
      ? undefined
      : watch(node, () => {
          setShown(true);
        });
  }, []);
  return [ref, shown];
}

/** Block rising into place, from blur to sharp, when it enters the viewport. */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}) {
  const [ref, shown] = useRevealed<HTMLDivElement>();
  const style: Vars = { '--d': `${String(delay)}s` };
  return (
    <div ref={ref} className={`reveal ${shown ? 'is-in' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * Words rising one after the other from behind their line. Screen readers get the plain sentence.
 * `now` starts at the first frame (above the fold) instead of waiting for the observer.
 */
export function SplitWords({
  text,
  delay = 0,
  step = 0.06,
  now = false,
}: {
  readonly text: string;
  readonly delay?: number;
  readonly step?: number;
  readonly now?: boolean;
}) {
  const [ref, revealed] = useRevealed<HTMLSpanElement>();
  const words = text.split(' ');
  return (
    <span ref={ref} className={now ? 'words-now' : revealed ? 'is-in' : ''}>
      <span className="sr-only">{text}</span>
      {words.map((word, index) => {
        const style: Vars = { '--d': `${String(delay + index * step)}s` };
        // The words of one sentence never reorder: their position is their identity.
        const key = `${String(index)}-${word}`;
        return (
          <Fragment key={key}>
            <span aria-hidden="true" className="word-mask">
              <span className="word" style={style}>
                {word}
              </span>
            </span>
            {index < words.length - 1 ? ' ' : null}
          </Fragment>
        );
      })}
    </span>
  );
}

/** Ambient bobbing (CSS keyframes, still under reduced motion). */
export function Float({
  children,
  className = '',
  delay = 0,
  duration = 6,
  rotate = 0,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly duration?: number;
  readonly rotate?: number;
}) {
  const style: Vars = {
    animationDelay: `${String(-delay)}s`,
    animationDuration: `${String(duration)}s`,
    '--r': `${String(rotate)}deg`,
  };
  return (
    <div className={`float ${className}`} style={style}>
      {children}
    </div>
  );
}
