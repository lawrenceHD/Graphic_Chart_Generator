'use client';

import { Check, Minus, X } from 'lucide-react';
import { contrastRatio, contrastVerdict, inkOn } from '../../brand/color';
import { COLOR_ROLES } from '../workspace/brand-view';
import { Measure, PAPER, SheetFrame, occurrenceOf, u, type SheetContext } from './sheet';
import { hairline } from './common';
import { BeyondPage } from './beyond';
import { contrastView } from './variant';

function VerdictIcon({ tone }: { readonly tone: 'ok' | 'mid' | 'bad' }) {
  const style = { width: u(1), height: u(1) };
  if (tone === 'ok') return <Check aria-hidden="true" style={style} />;
  if (tone === 'mid') return <Minus aria-hidden="true" style={style} />;
  return <X aria-hidden="true" style={style} />;
}

interface Swatch {
  readonly hex: string;
  readonly name: string;
}

// White is added for reference unless a role already is white; equal colours are shown once.
function swatchesOf(context: SheetContext): readonly Swatch[] {
  const { view, words } = context;
  return [
    ...COLOR_ROLES.map((role) => ({ hex: view.colors[role], name: words.roles[role] })),
    { hex: '#FFFFFF', name: words.logo.white },
  ].filter((swatch, index, list) => list.findIndex((other) => other.hex === swatch.hex) === index);
}

function pairsOf(swatches: readonly Swatch[], limit: number) {
  return swatches
    .flatMap((text) =>
      swatches
        .filter((background) => background.hex !== text.hex)
        .map((background) => ({
          text,
          background,
          ratio: contrastRatio(text.hex, background.hex),
        })),
    )
    .filter((pair) => pair.ratio >= 4.5)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

// The recommended pairs alone, each one a flat field with its text set on it.
function Pairs({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const pairs = pairsOf(swatchesOf(context), 6);
  return (
    <SheetFrame context={context} lead={words.lead.contrast}>
      <div className="grid h-full grid-cols-3 grid-rows-2" style={{ gap: u(1) }}>
        {pairs.map((pair) => {
          const verdict = contrastVerdict(pair.ratio);
          return (
            <div
              key={`${pair.text.hex}${pair.background.hex}`}
              className="flex min-h-0 flex-col justify-between"
              style={{ background: pair.background.hex, color: pair.text.hex, padding: u(1.4) }}
            >
              <p
                className="m-0"
                style={{ fontFamily: view.pairing.display.css, fontSize: u(3.4), fontWeight: 600 }}
              >
                Aa
              </p>
              <div>
                <p className="m-0" style={{ fontSize: u(1) }}>
                  {words.contrast.textOn(pair.text.name, pair.background.name)}
                </p>
                <p className="tabular m-0" style={{ fontSize: u(1.3), fontWeight: 600 }}>
                  {pair.ratio.toFixed(1)}:1 · {words.contrast.levels[verdict.level]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </SheetFrame>
  );
}

function Matrix({ context }: { readonly context: SheetContext }) {
  const { words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const swatches = swatchesOf(context);
  const pairs = pairsOf(swatches, 4);
  return (
    <SheetFrame
      context={context}
      lead={words.lead.contrast}
      aside={
        <div>
          <p
            className="m-0 uppercase"
            style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {words.contrast.best}
          </p>
          <ul className="m-0 list-none p-0" style={{ marginTop: u(0.8) }}>
            {pairs.map((pair) => (
              <li
                key={`${pair.text.hex}${pair.background.hex}`}
                className="flex items-center justify-between border-t"
                style={{ ...hairline(ink), fontSize: u(1), paddingBlock: u(0.5) }}
              >
                <span className="flex items-center" style={{ gap: u(0.6) }}>
                  <span
                    className="grid place-items-center"
                    style={{
                      background: pair.background.hex,
                      color: pair.text.hex,
                      width: u(2.4),
                      height: u(1.6),
                      borderRadius: 0,
                      fontSize: u(0.9),
                      fontWeight: 600,
                    }}
                  >
                    Aa
                  </span>
                  {words.contrast.textOn(pair.text.name, pair.background.name)}
                </span>
                <Measure>{pair.ratio.toFixed(1)}:1</Measure>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <div className="flex h-full flex-col" style={{ gap: u(0.8) }}>
        <p className="m-0" style={{ fontSize: u(1), opacity: 0.7 }}>
          {words.contrast.legend}
        </p>
        <div
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: `${u(7)} repeat(${String(swatches.length)}, 1fr)`,
            gap: u(0.5),
          }}
        >
          <span />
          {swatches.map((background) => (
            <span
              key={background.hex}
              className="truncate"
              style={{ fontSize: u(0.85), opacity: 0.7, alignSelf: 'end' }}
            >
              {background.hex}
            </span>
          ))}
          {swatches.map((text) => (
            <ContrastRow key={text.hex} text={text} swatches={swatches} words={words} />
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function ContrastRow({
  text,
  swatches,
  words,
}: {
  readonly text: { readonly hex: string; readonly name: string };
  readonly swatches: readonly { readonly hex: string; readonly name: string }[];
  readonly words: SheetContext['words'];
}) {
  return (
    <>
      <span className="flex items-center truncate" style={{ fontSize: u(0.95) }}>
        {text.name}
      </span>
      {swatches.map((background) => {
        if (background.hex === text.hex)
          return (
            <span
              key={background.hex}
              style={{
                borderRadius: 0,
                background: 'color-mix(in oklch, currentColor 5%, transparent)',
              }}
            />
          );
        const ratio = contrastRatio(text.hex, background.hex);
        const verdict = contrastVerdict(ratio);
        return (
          <span
            key={background.hex}
            className="flex flex-col items-center justify-center border"
            style={{
              background: background.hex,
              color: text.hex,
              borderRadius: 0,
              borderColor: 'color-mix(in oklch, currentColor 10%, transparent)',
              opacity: verdict.tone === 'bad' ? 0.55 : 1,
            }}
          >
            <span className="tabular" style={{ fontSize: u(1.25), fontWeight: 600 }}>
              {ratio.toFixed(1)}
            </span>
            <span className="flex items-center" style={{ fontSize: u(0.78), gap: u(0.3) }}>
              <VerdictIcon tone={verdict.tone} />
              {words.contrast.levels[verdict.level]}
            </span>
          </span>
        );
      })}
    </>
  );
}

export function Contrast({ context }: { readonly context: SheetContext }) {
  const shown = contrastView(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  return shown.kind === 'pairs' ? <Pairs context={context} /> : <Matrix context={context} />;
}
