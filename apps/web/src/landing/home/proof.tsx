'use client';

import { contrastRatio, formatRatio } from '@app/color-engine';
import { useTranslations } from 'next-intl';
import { Reveal } from '../../ui/fx';
import { useBrand } from './brand-context';

const CARD = 'flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6';
const LABEL = 'm-0 font-mono text-xs text-ink-3';

function Variants() {
  const t = useTranslations('homePage.proof');
  const { view } = useBrand();
  const tiles = [
    { key: 'color', src: view.logo.color, bg: 'bg-preview' },
    { key: 'black', src: view.logo['mono-black'], bg: 'bg-white' },
    { key: 'white', src: view.logo['mono-white'], bg: 'bg-black' },
  ] as const;
  return (
    <div className={CARD}>
      <h3 className={LABEL}>{t('variants')}</h3>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {tiles.map((tile) => (
          <li key={tile.key} className="flex flex-col gap-1.5">
            <span
              className={`grid aspect-square place-items-center rounded-lg border border-line p-3 ${tile.bg}`}
            >
              {tile.src === null ? (
                <span className="text-center text-xs text-ink-3">{t('noVariant')}</span>
              ) : (
                <img src={tile.src} alt="" className="size-full object-contain" />
              )}
            </span>
            <span className="text-xs text-ink-2">{t(`variant.${tile.key}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every pair of the palette against every other: the real ratio in each cell, the verdict by text, not colour alone. */
function Matrix() {
  const t = useTranslations('homePage.proof');
  const { example } = useBrand();
  const colors = example.colors;
  return (
    <div className={`${CARD} lg:col-span-2`}>
      <h3 className={LABEL}>{t('matrix')}</h3>
      <div
        role="table"
        aria-label={t('matrix')}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${String(colors.length)}, minmax(0, 1fr))` }}
      >
        {colors.flatMap((back) =>
          colors.map((front) => {
            const ratio = contrastRatio(front.hex, back.hex);
            const same = front.role === back.role;
            return (
              <div
                role="cell"
                aria-label={same ? undefined : `${front.hex} / ${back.hex} : ${formatRatio(ratio)}:1`}
                key={`${back.role}-${front.role}`}
                className="flex aspect-[1.6] flex-col items-start justify-between rounded-md border border-line p-2"
                style={{ backgroundColor: back.hex, color: front.hex }}
              >
                {same ? (
                  <span aria-hidden="true">·</span>
                ) : (
                  <>
                    <span className="font-display text-lg leading-none font-bold">Aa</span>
                    <span className="tabular font-mono text-xs">
                      {formatRatio(ratio)}
                      </span>
                  </>
                )}
              </div>
            );
          }),
        )}
      </div>
      <p className="m-0 text-xs text-ink-3">{t('matrixNote')}</p>
    </div>
  );
}

function Files() {
  const t = useTranslations('homePage.proof');
  const { example } = useBrand();
  return (
    <div className={CARD}>
      <h3 className={LABEL}>{t('files')}</h3>
      <pre className="m-0 overflow-x-auto rounded-lg bg-elevated p-3 font-mono text-xs leading-relaxed text-ink-2">
        {`:root {\n  ${example.tokens.join('\n  ')}\n}`}
      </pre>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {(['pdf', 'svg', 'css'] as const).map((kind) => (
          <li
            key={kind}
            className="rounded-full border border-line-strong px-3 py-1 font-mono text-xs text-ink"
          >
            {t(`kind.${kind}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Proof() {
  const t = useTranslations('homePage.proof');
  return (
    <section id="preuves" aria-labelledby="proof-title" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12 flex max-w-[60ch] flex-col gap-4">
          <h2
            id="proof-title"
            className="m-0 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance"
          >
            {t('title')}
          </h2>
          <p className="m-0 text-base text-ink-2">{t('lead')}</p>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-4">
          <Reveal className="lg:col-span-2">
            <Matrix />
          </Reveal>
          <Reveal delay={0.1}>
            <Variants />
          </Reveal>
          <Reveal delay={0.2}>
            <Files />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
