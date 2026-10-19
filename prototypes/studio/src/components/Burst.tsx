import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useReduce } from '../lib/motion-pref';

// Celebration when the charter is ready: particles in the brand colours, transform and opacity only, once.
// Deterministic spread (no Math.random): the same burst every time.
export function Burst({ colors, play }: { colors: string[]; play: boolean }) {
  const reduce = useReduce();
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const angle = (index / 36) * Math.PI * 2 + (index % 3) * 0.2;
        const distance = 140 + ((index * 37) % 120);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance * 0.7 + 60,
          rotate: (index * 47) % 360,
          size: 6 + (index % 4) * 3,
          color: colors[index % colors.length] ?? '#fff',
          round: index % 2 === 0,
        };
      }),
    [colors],
  );
  if (!play || reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed left-1/2 top-16 z-50">
      {particles.map((p, index) => (
        <motion.span
          key={index}
          className="absolute block"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? 999 : 2,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.x,
            y: [0, p.y - 40, p.y + 120],
            opacity: [1, 1, 0],
            scale: 1,
            rotate: p.rotate,
          }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
