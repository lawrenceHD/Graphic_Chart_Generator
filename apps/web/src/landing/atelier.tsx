'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DemoSheet } from './demo-sheet';
import { DEMO_EXAMPLE_ID, type ColorRole, type LandingExample } from './example-source';

type Shown = 'cover' | 'palette' | 'contrast' | 'typography';
const SHOWN: readonly Shown[] = ['cover', 'palette', 'contrast', 'typography'];

const SEGMENT =
  'grid min-h-11 cursor-pointer place-items-center rounded-full px-4 text-sm text-ink-2 transition-colors hover:text-ink has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus';

function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  readonly legend: string;
  readonly name: string;
  readonly options: readonly { readonly id: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (next: T) => void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className={SEGMENT}>
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={() => {
              onChange(option.id);
            }}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Interactive preview of a sample guideline: the sheets are drawn by the studio's own renderers. */
export function Atelier({ examples }: { readonly examples: readonly LandingExample[] }) {
  const t = useTranslations('homePage.atelier');
  const [exampleId, setExampleId] = useState(examples[0]?.id ?? '');
  const [shown, setShown] = useState<Shown>('cover');
  const example = examples.find((entry) => entry.id === exampleId) ?? examples[0];
  if (example === undefined) return null;
  const role = (key: ColorRole): string => t(`role.${key}`);

  return (
    <div
      role="region"
      aria-label={t('region')}
      className="grid gap-6 rounded-xl border border-line bg-surface p-4 sm:p-6 lg:grid-cols-12"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            legend={t('pages')}
            name="atelier-page"
            value={shown}
            onChange={setShown}
            options={SHOWN.map((id) => ({ id, label: t(`page.${id}`) }))}
          />
          {examples.length > 1 ? (
            <Segmented
              legend={t('example')}
              name="atelier-example"
              value={example.id}
              onChange={setExampleId}
              options={examples.map((entry) => ({ id: entry.id, label: entry.name }))}
            />
          ) : null}
        </div>
        <div className="drafting grid place-items-center rounded-lg bg-preview p-4 sm:p-8">
          <div className="w-full overflow-hidden rounded-md shadow-lg" aria-live="polite">
            {example.id === DEMO_EXAMPLE_ID ? <DemoSheet type={shown} /> : null}
          </div>
        </div>
        <p className="m-0 text-sm text-ink-3">{t('demoNote')}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
        <section aria-labelledby="atelier-colors" className="flex flex-col gap-3">
          <h3 id="atelier-colors" className="m-0 text-base font-semibold">
            {t('colorsTitle')}
          </h3>
          <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
            {example.colors.map((color) => (
              <li key={color.role} className="flex min-w-0 flex-col gap-1">
                <span
                  aria-hidden="true"
                  className="block h-14 rounded-md border border-line"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="truncate text-xs text-ink-2">{role(color.role)}</span>
                <span className="font-mono text-xs tabular text-ink">{color.hex}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="atelier-contrast" className="flex flex-col gap-3">
          <h3 id="atelier-contrast" className="m-0 text-base font-semibold">
            {t('contrastTitle')}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {example.contrasts.map((pair) => (
              <li
                key={`${pair.foreground}-${pair.background}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-ink-2">
                  {t('pair', {
                    foreground: role(pair.foreground),
                    background: role(pair.background),
                  })}
                </span>
                <span className="font-mono tabular">
                  {pair.ratio}:1 · {t(`level.${pair.level}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="atelier-tokens" className="flex flex-col gap-3">
          <h3 id="atelier-tokens" className="m-0 text-base font-semibold">
            {t('tokensTitle')}
          </h3>
          <pre className="m-0 overflow-x-auto rounded-md bg-elevated p-3 font-mono text-xs leading-relaxed text-ink-2">
            {example.tokens.join('\n')}
          </pre>
        </section>
      </div>
    </div>
  );
}
