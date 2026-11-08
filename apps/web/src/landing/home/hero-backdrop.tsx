'use client';

import { useBrand } from './brand-context';

// Behind the headline: a brand-coloured mesh (the only colour of the page comes from the chosen example), a
// millimetre grid with registration crosses, and orbits on which the page's proofs travel.
const RINGS = [260, 420, 600, 820] as const;

export function HeroBackdrop() {
  const { example } = useBrand();
  const [primary, accent] = example.colors;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-clip">
      <div
        className="absolute -top-40 left-1/2 h-[720px] w-[1200px] -translate-x-1/2 opacity-60 blur-3xl transition-[background] duration-1000"
        style={{
          background: `radial-gradient(40% 50% at 30% 40%, color-mix(in oklch, ${primary?.hex ?? 'transparent'} 55%, transparent), transparent 70%), radial-gradient(38% 46% at 72% 55%, color-mix(in oklch, ${accent?.hex ?? 'transparent'} 55%, transparent), transparent 70%)`,
        }}
      />
      <div className="blueprint absolute inset-0" />
      <svg
        className="absolute top-[300px] left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 text-line-strong/40"
        viewBox="-500 -500 1000 1000"
        fill="none"
      >
        {RINGS.map((r, index) => (
          <circle
            key={r}
            r={r / 2}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray={index % 2 === 0 ? '2 7' : undefined}
            opacity={1 - index * 0.2}
          />
        ))}
      </svg>
    </div>
  );
}
