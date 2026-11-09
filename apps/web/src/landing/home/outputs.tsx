'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { DemoSheet } from '../demo-sheet';
import { Reveal } from '../../ui/fx';
import { ACCENT } from './accent';
import { useBrand } from './brand-context';

const GLASS =
  'glass flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-xl';

function Card({
  id,
  className = '',
  children,
}: {
  readonly id: 'pdf' | 'kit' | 'css' | 'tailwind' | 'dtcg';
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const t = useTranslations('homePage.outputs');
  return (
    <div className={`${GLASS} ${className}`}>
      <h3 className="m-0 font-display text-xl font-bold tracking-tight">{t(`${id}.title`)}</h3>
      <p className="m-0 text-sm text-ink-2">{t(`${id}.text`)}</p>
      {children}
    </div>
  );
}

const CODE =
  'm-0 overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed text-ink-2';

/** The exports, on a night table: every excerpt is computed from the brand on screen. */
export function Outputs() {
  const t = useTranslations('homePage.outputs');
  const { example, view } = useBrand();
  const names = ['primary', 'accent', 'paper', 'ink'] as const;
  const tailwind = example.colors.map((c, i) => `  --color-${names[i] ?? c.role}: ${c.hex};`);
  const dtcg = example.colors
    .slice(0, 2)
    .map((c, i) => `  "${names[i] ?? c.role}": { "$type": "color", "$value": "${c.hex}" }`);
  const variants = [view.logo['mono-black'], view.logo['mono-white']] as const;
  return (
    <section
      id="fichiers"
      aria-labelledby="outputs-title"
      className="relative isolate scroll-mt-24 overflow-clip bg-canvas py-24 text-ink theme-night sm:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -z-10 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklch, ${example.colors[0]?.hex ?? 'transparent'} 45%, transparent), transparent)`,
        }}
      />
      <div className="mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12 flex max-w-[60ch] flex-col gap-4">
          <h2
            id="outputs-title"
            className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.03em] text-balance"
          >
            {t.rich('title', ACCENT)}
          </h2>
          <p className="m-0 text-base text-ink-2">{t('lead')}</p>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <Card id="pdf" className="h-full">
              <div className="overflow-hidden rounded-md shadow-xl ring-1 ring-line">
                <DemoSheet type="cover" exampleId={example.id} />
              </div>
            </Card>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={0.08}>
            <Card id="kit" className="h-full">
              <ul className="m-0 flex list-none gap-2 p-0">
                {[
                  { src: view.logo.color, bg: 'bg-preview' },
                  { src: variants[0], bg: 'bg-white' },
                  { src: variants[1], bg: 'bg-black' },
                ].map((tile) => (
                  <li
                    key={tile.bg}
                    className={`grid aspect-square flex-1 place-items-center rounded-md border border-line p-2 ${tile.bg}`}
                  >
                    {tile.src === null ? null : (
                      <img src={tile.src} alt="" className="size-full object-contain" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={0.16}>
            <Card id="css" className="h-full">
              <pre
                className={CODE}
              >{`:root {\n${example.tokens.map((line) => `  ${line}`).join('\n')}\n}`}</pre>
            </Card>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={0.24}>
            <Card id="tailwind" className="h-full">
              <pre className={CODE}>{`@theme {\n${tailwind.join('\n')}\n}`}</pre>
            </Card>
          </Reveal>
          <Reveal className="lg:col-span-2" delay={0.32}>
            <Card id="dtcg" className="h-full">
              <pre className={CODE}>{`{\n${dtcg.join(',\n')}\n}`}</pre>
            </Card>
          </Reveal>
        </div>
        <p className="mt-8 mb-0 max-w-[70ch] text-sm text-ink-3">{t('note')}</p>
      </div>
    </section>
  );
}
