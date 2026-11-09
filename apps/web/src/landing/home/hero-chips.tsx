'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Float } from '../../ui/fx';
import { useBrand } from './brand-context';
import { colorOf } from './palette-tools';

const CHIP =
  'absolute hidden items-center gap-2 rounded-[22px] border border-line bg-surface/90 px-4 py-2.5 text-xs shadow-[0_24px_50px_-28px_rgb(0_0_0/0.45)] sm:flex';

/** Fragments of the real guideline around the title: every value is read from the brand on screen. */
export function HeroChips() {
  const t = useTranslations('homePage.hero');
  const level = useTranslations('homePage.atelier.level');
  const { example } = useBrand();
  const contrast = example.contrasts[0];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Float className={`${CHIP} top-[16%] left-[6%]`} rotate={-6} delay={0} duration={8}>
        {example.colors.map((color) => (
          <span
            key={color.role}
            className="size-5 rounded-full border border-line"
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </Float>
      {contrast === undefined ? null : (
        <Float
          className={`${CHIP} top-[12%] right-[7%] font-mono`}
          rotate={5}
          delay={2}
          duration={9}
        >
          <Check className="size-3.5 text-success" />
          <span className="tabular">
            {contrast.ratio}:1 · {level(contrast.level)}
          </span>
        </Float>
      )}
      <Float className={`${CHIP} bottom-[26%] left-[4%]`} rotate={4} delay={1} duration={10}>
        <span className="font-display text-2xl leading-none">Aa</span>
        <span className="flex flex-col leading-tight">
          <span className="text-ink-3">{t('chipFont')}</span>
          <span className="font-mono">{example.fonts.display}</span>
        </span>
      </Float>
      <Float className={`${CHIP} right-[5%] bottom-[30%]`} rotate={-4} delay={3} duration={8.5}>
        <span
          className="grid size-8 place-items-center rounded-xl p-1"
          style={{ backgroundColor: colorOf(example, 'primary') }}
        >
          <img src={example.logo} alt="" className="size-full object-contain" />
        </span>
        <span className="font-mono">{t('chipFavicon')}</span>
      </Float>
    </div>
  );
}
