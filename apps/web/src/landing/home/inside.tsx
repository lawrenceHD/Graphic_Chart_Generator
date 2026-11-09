'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Reveal, SplitWords, Tilt } from '../../ui/fx';
import { BrandChips } from './brand-chips';
import { useBrand } from './brand-context';
import { inkOn } from './palette-tools';

function Tile({
  title,
  note,
  children,
  className = '',
}: {
  readonly title: string;
  readonly note: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Reveal className={className}>
      <Tilt
        max={5}
        className="flex h-full flex-col gap-5 rounded-[36px] border border-line bg-surface p-6 sm:p-7"
      >
        <div>
          <h3 className="m-0 text-xl font-semibold">{title}</h3>
          <p className="m-0 mt-1 text-sm text-ink-3">{note}</p>
        </div>
        <div className="flex-1">{children}</div>
      </Tilt>
    </Reveal>
  );
}

/** What a guideline holds, for the chosen brand: palette, measured contrasts, variants, exported tokens. */
export function Inside() {
  const t = useTranslations('homePage.inside');
  const level = useTranslations('homePage.atelier.level');
  const { example, view } = useBrand();
  const variants = [
    { key: 'color', src: view.logo.color, bg: 'bg-preview' },
    { key: 'black', src: view.logo['mono-black'], bg: 'bg-white' },
    { key: 'white', src: view.logo['mono-white'], bg: 'bg-black' },
  ] as const;
  return (
    <section
      id="charte"
      aria-labelledby="inside-title"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24"
    >
      <h2
        id="inside-title"
        className="m-0 max-w-3xl font-display text-[clamp(2.25rem,7vw,5.25rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance"
      >
        <SplitWords text={t('title')} />
      </h2>
      <div className="mt-8">
        <BrandChips group="inside" />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Tile className="md:col-span-2 md:row-span-2" title={t('palette')} note={t('paletteNote')}>
          <ul className="m-0 grid h-full min-h-[340px] list-none grid-cols-4 gap-3 p-0">
            {example.colors.map((color, index) => (
              <motion.li
                key={color.role}
                layout
                className={`flex flex-col justify-end rounded-[26px] border border-line p-4 ${index === 0 ? 'col-span-4 min-h-[200px] sm:col-span-2 sm:row-span-2' : 'col-span-2 min-h-[100px] sm:col-span-1'}`}
                animate={{ backgroundColor: color.hex, color: inkOn(example, color.hex) }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
              >
                <span className="font-mono text-xs">{color.hex}</span>
              </motion.li>
            ))}
          </ul>
        </Tile>
        <Tile title={t('contrast')} note={t('contrastNote')}>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {example.contrasts.map((pair) => {
              const front = example.colors.find((c) => c.role === pair.foreground)?.hex;
              const back = example.colors.find((c) => c.role === pair.background)?.hex;
              return (
                <li
                  key={`${pair.foreground}-${pair.background}`}
                  className="flex items-center justify-between rounded-[18px] border border-line px-4 py-3"
                  style={{ backgroundColor: back, color: front }}
                >
                  <span className="font-display text-lg font-bold">Aa</span>
                  <span className="tabular font-mono text-sm">
                    {pair.ratio} · {level(pair.level)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Tile>
        <Tile title={t('variants')} note={t('variantsNote')}>
          <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
            {variants.map((variant) => (
              <li
                key={variant.key}
                className={`grid aspect-square place-items-center rounded-[20px] border border-line ${variant.bg}`}
              >
                {variant.src === null ? null : (
                  <img src={variant.src} alt="" className="size-3/5 object-contain" />
                )}
              </li>
            ))}
          </ul>
        </Tile>
        <Tile className="md:col-span-3" title={t('tokens')} note={t('tokensNote')}>
          <pre className="m-0 overflow-x-auto rounded-[20px] bg-elevated p-4 font-mono text-xs leading-relaxed text-ink-2">
            {`:root {\n${example.tokens.map((line) => `  ${line}`).join('\n')}\n}`}
          </pre>
        </Tile>
      </div>
    </section>
  );
}
