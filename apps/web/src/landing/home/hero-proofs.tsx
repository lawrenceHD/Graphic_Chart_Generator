'use client';

import { useTranslations } from 'next-intl';
import { Float } from '../../ui/fx';
import { useBrand } from './brand-context';

const CHIP =
  'glass flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 shadow-lg backdrop-blur-md';

/** Measured values that travel around the sheets: each one is computed from the chosen example, never typed. */
export function HeroProofs() {
  const t = useTranslations('homePage.hero.proof');
  const { example } = useBrand();
  const contrast = example.contrasts[0];
  return (
    <>
      <div className="absolute bottom-[4%] left-[1%] z-20 hidden sm:block">
        <Float delay={1} duration={7} rotate={-1}>
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-xl">
            <span className="font-mono text-xs text-ink-3">{t('palette')}</span>
            <div className="flex gap-1.5">
              {example.colors.map((color) => (
                <span
                  key={color.role}
                  aria-hidden="true"
                  className="size-9 rounded-md border border-line"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
            <span className="tabular font-mono text-xs">{example.colors[0]?.hex}</span>
          </div>
        </Float>
      </div>
      {contrast === undefined ? null : (
        <div className="absolute top-[2%] left-[18%] z-20 hidden lg:block">
          <Float delay={2} duration={6}>
            <div className={CHIP}>
              <span aria-hidden="true" className="pulse-dot size-2 rounded-full bg-success" />
              <span className="tabular font-mono text-xs">
                {contrast.ratio}:1 · {t(`level.${contrast.level}`)}
              </span>
            </div>
          </Float>
        </div>
      )}
      <div className="absolute top-[34%] right-[0%] z-20 hidden lg:block">
        <Float delay={0.5} duration={8} rotate={1}>
          <pre className="m-0 rounded-lg border border-line bg-surface p-3 font-mono text-xs leading-relaxed text-ink-2 shadow-xl">
            {example.tokens.slice(0, 3).join('\n')}
          </pre>
        </Float>
      </div>
    </>
  );
}
