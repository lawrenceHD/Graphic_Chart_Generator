'use client';

import { motion } from 'motion/react';
import { LOGO_WALL, type WallLogo } from './logo-wall';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const HALF = Math.ceil(LOGO_WALL.length / 2);
const ROWS: readonly (readonly WallLogo[])[] = [LOGO_WALL.slice(0, HALF), LOGO_WALL.slice(HALF)];

/** Two ribbons of marks drifting in opposite directions: texture, not references (decorative, hidden from readers). */
export function LogoWallStrip() {
  return (
    <section aria-hidden="true" className="py-12">
      <div className="space-y-5 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        {ROWS.map((row, rowIndex) => (
          <div
            key={row[0]?.src ?? rowIndex}
            className="marquee flex w-max gap-5"
            style={{
              animationDirection: rowIndex > 0 ? 'reverse' : 'normal',
              animationDuration: rowIndex > 0 ? '80s' : '65s',
            }}
          >
            {[...row, ...row].map((logo, index) => (
              <motion.div
                key={`${logo.src}-${String(index)}`}
                whileHover={{ y: -8, rotate: index % 2 > 0 ? 4 : -4, scale: 1.08 }}
                transition={SOFT}
                className={`grid size-20 shrink-0 place-items-center rounded-[26px] border border-line p-4 sm:size-24 ${logo.dark ? 'theme-night bg-surface' : 'bg-surface'}`}
              >
                <img src={logo.src} alt="" className="size-full object-contain" loading="lazy" />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
