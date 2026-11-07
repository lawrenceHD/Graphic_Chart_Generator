'use client';

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
import { hairline } from './common';
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
  const ink = inkOn(context.background ?? PAPER);
  const ratio = view.rules.clearSpaceRatio;
  // Logo box in percent of the drawing: height 1, width = aspect, margin = ratio on every side.
  const totalWidth = aspect + 2 * ratio;
  const totalHeight = 1 + 2 * ratio;
  const guide = `color-mix(in oklch, ${view.colors.accent} 70%, ${ink})`;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.clearSpace}
      aside={
        <div className="flex flex-col" style={{ gap: u(1.4) }}>
          <p className="m-0" style={{ fontSize: u(1.1), opacity: 0.72 }}>
            {words.clearSpace.zone(Math.round(ratio * 100))}
          </p>
          {withMinimum ? (
            <div className="border-t" style={{ ...hairline(ink), paddingTop: u(1.2) }}>
              <p
                className="m-0 uppercase"
                style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
              >
                {words.clearSpace.minimum}
              </p>
              <div className="flex items-end" style={{ gap: u(2.4), marginTop: u(1) }}>
                <MinSize
                  label={words.clearSpace.screen}
                  value={`${String(view.rules.minSizePx)} px`}
                  src={view.logo.color}
                  height={2.4}
                />
                <MinSize
                  label={words.clearSpace.print}
                  value={`${String(view.rules.minSizeMm)} mm`}
                  src={view.logo.color}
                  height={1.6}
                />
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="relative grid h-full place-items-center" style={{ containerType: 'size' }}>
        <div
          className="relative"
          style={{
            // The drawing keeps its proportions inside both limits of the page (no overflow).
            aspectRatio: `${String(totalWidth)} / ${String(totalHeight)}`,
            width: `min(88cqw, ${String((74 * totalWidth) / totalHeight)}cqh)`,
          }}
        >
          <div
            className="absolute inset-0 border border-dashed"
            style={{
              borderColor: guide,
              background: `color-mix(in oklch, ${view.colors.accent} 9%, transparent)`,
            }}
          />
          <div
            className="absolute"
            style={{
              left: `${String((ratio / totalWidth) * 100)}%`,
              right: `${String((ratio / totalWidth) * 100)}%`,
              top: `${String((ratio / totalHeight) * 100)}%`,
              bottom: `${String((ratio / totalHeight) * 100)}%`,
              outline: `1px solid ${guide}`,
            }}
          >
            <LogoImage src={view.logo.color} alt={view.name} className="size-full" />
          </div>
          {(['top', 'left'] as const).map((side) => (
            <span
              key={side}
              className="absolute grid place-items-center"
              style={{
                fontSize: u(1.1),
                color: guide,
                ...(side === 'top'
                  ? {
                      top: 0,
                      height: `${String((ratio / totalHeight) * 100)}%`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }
                  : {
                      left: 0,
                      width: `${String((ratio / totalWidth) * 100)}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }),
              }}
            >
              x
            </span>
          ))}
        </div>
      </div>
    </SheetFrame>
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
