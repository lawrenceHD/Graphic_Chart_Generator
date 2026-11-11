'use client';

import type { CSSProperties } from 'react';
import { FullPage, M, T, caps } from './art/chrome';
import { inkOn } from '../../brand/color';
import {
  LogoImage,
  Measure,
  PAPER,
  SheetFrame,
  occurrenceOf,
  u,
  useImageAspect,
  type SheetContext,
} from './sheet';
import { BeyondPage } from './beyond';
import { clearSpaceView } from './variant';

function Drawing({
  context,
  withMinimum,
}: {
  readonly context: SheetContext;
  /** The overview carries the minimum sizes under the zone note; the zone page leaves them to their own page. */
  readonly withMinimum: boolean;
}) {
  const { view, words } = context;
  const measured = useImageAspect(view.logo.color);
  const aspect = typeof measured === 'number' ? measured : 2;
  const ratio = view.rules.clearSpaceRatio;
  // Logo box in units of the logo's height: height 1, width = aspect, margin = ratio on every side.
  const totalWidth = aspect + 2 * ratio;
  const totalHeight = 1 + 2 * ratio;
  const panel = view.colors.neutralLight;
  const guide = `color-mix(in oklch, ${view.colors.accent} 55%, ${inkOn(panel)})`;
  const pctX = (ratio / totalWidth) * 100;
  const pctY = (ratio / totalHeight) * 100;
  const ghost = (style: CSSProperties) => (
    <span
      className="absolute grid place-items-center"
      style={{
        ...style,
        width: `${String(pctX)}%`,
        height: `${String(pctY)}%`,
        background: `color-mix(in oklch, ${view.colors.accent} 30%, transparent)`,
        color: guide,
        fontSize: u(1.3),
        fontFamily: view.pairing.display.css,
        fontStyle: 'italic',
      }}
    >
      x
    </span>
  );
  return (
    <FullPage context={context} field={PAPER} box={{ left: M.side, right: 64 }}>
      <div
        className="absolute inset-y-0 right-0"
        style={{ width: '62%', background: panel, containerType: 'size' }}
      >
        <div
          className="absolute"
          style={{
            // The drawing keeps its proportions inside both limits of the panel (no overflow).
            aspectRatio: `${String(totalWidth)} / ${String(totalHeight)}`,
            width: `min(76cqw, ${String((70 * totalWidth) / totalHeight)}cqh)`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              border: `1px solid ${guide}`,
              background: `color-mix(in oklch, ${view.colors.accent} 8%, transparent)`,
            }}
          />
          {ghost({ top: 0, left: '50%', transform: 'translateX(-50%)' })}
          {ghost({ bottom: 0, left: '50%', transform: 'translateX(-50%)' })}
          {ghost({ left: 0, top: '50%', transform: 'translateY(-50%)' })}
          {ghost({ right: 0, top: '50%', transform: 'translateY(-50%)' })}
          <div
            className="absolute"
            style={{
              left: `${String(pctX)}%`,
              right: `${String(pctX)}%`,
              top: `${String(pctY)}%`,
              bottom: `${String(pctY)}%`,
              outline: `1px dashed ${guide}`,
            }}
          >
            <LogoImage src={view.logo.color} alt={view.name} className="size-full" />
          </div>
        </div>
      </div>
      <div className="absolute" style={{ left: u(M.side), top: u(14), width: u(32) }}>
        <p
          className="tabular m-0"
          style={{
            fontFamily: view.pairing.display.css,
            fontSize: u(T.title + 1.6),
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            fontWeight: 700,
          }}
        >
          x = {String(Math.round(ratio * 100))} %
        </p>
        <p
          className="m-0 text-pretty"
          style={{
            fontSize: u(T.body),
            lineHeight: 1.5,
            opacity: 0.78,
            marginTop: u(1.6),
            maxWidth: '34ch',
          }}
        >
          {words.clearSpace.zone(Math.round(ratio * 100))}
        </p>
      </div>
      {withMinimum ? (
        <div className="absolute" style={{ left: u(M.side), bottom: u(8), width: u(32) }}>
          <p
            className="m-0"
            style={{
              ...caps(),
              borderTop: `1px solid color-mix(in oklch, ${inkOn(PAPER)} 30%, transparent)`,
              paddingTop: u(0.9),
            }}
          >
            {words.clearSpace.minimum}
          </p>
          <div className="flex items-end" style={{ gap: u(3), marginTop: u(1.2) }}>
            <MinSize
              label={words.clearSpace.screen}
              value={`${String(view.rules.minSizePx)} px`}
              src={view.logo.color}
              height={2.8}
            />
            <MinSize
              label={words.clearSpace.print}
              value={`${String(view.rules.minSizeMm)} mm`}
              src={view.logo.color}
              height={1.8}
            />
          </div>
        </div>
      ) : null}
    </FullPage>
  );
}

function MinSize({
  label,
  value,
  src,
  height,
}: {
  readonly label: string;
  readonly value: string;
  readonly src: string;
  readonly height: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: u(0.6) }}>
      <LogoImage src={src} style={{ height: u(height), width: 'auto', maxWidth: u(12) }} />
      <Measure style={{ opacity: 0.75 }}>
        {label} · {value}
      </Measure>
    </div>
  );
}

// The minimum sizes alone: the logo at the smallest size allowed, then at twice and four times that size.
function Minimum({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const rows = [
    { label: words.clearSpace.screen, unit: 'px', base: view.rules.minSizePx, height: 2.4 },
    { label: words.clearSpace.print, unit: 'mm', base: view.rules.minSizeMm, height: 1.6 },
  ];
  return (
    <SheetFrame context={context} lead={words.lead.clearSpace}>
      <div className="grid h-full grid-rows-2" style={{ gap: u(2.4) }}>
        {rows.map((row) => (
          <div key={row.unit} className="flex min-h-0 flex-col" style={{ gap: u(1) }}>
            <p
              className="m-0 uppercase"
              style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
            >
              {words.clearSpace.minimum} · {row.label}
            </p>
            <div className="flex min-h-0 flex-1 items-end" style={{ gap: u(5) }}>
              {[1, 2, 4].map((factor) => (
                <MinSize
                  key={factor}
                  label={factor === 1 ? words.clearSpace.minimum : `× ${String(factor)}`}
                  value={`${String(row.base * factor)} ${row.unit}`}
                  src={view.logo.color}
                  height={row.height * factor}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SheetFrame>
  );
}

export function ClearSpace({ context }: { readonly context: SheetContext }) {
  const shown = clearSpaceView(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  if (shown.kind === 'minimum') return <Minimum context={context} />;
  return <Drawing context={context} withMinimum={shown.kind === 'overview'} />;
}
