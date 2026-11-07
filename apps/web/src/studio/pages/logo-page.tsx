'use client';

import type { CSSProperties, ReactNode } from 'react';
import { contrastRatio, inkOn } from '../../brand/color';
import {
  LogoImage,
  PAPER,
  SheetFrame,
  logoOn,
  occurrenceOf,
  u,
  useImageAspect,
  useTintedLogo,
  Label,
  type SheetContext,
} from './sheet';
import { BeyondPage } from './beyond';
import { logoView } from './variant';

export function Tile({
  background,
  children,
  label,
  ink,
  style,
  className = '',
}: {
  readonly background: string;
  readonly children: ReactNode;
  readonly label?: string;
  readonly ink: string;
  readonly style?: CSSProperties;
  readonly className?: string;
}) {
  // A flat block of colour, as printed guidelines show versions: no radius, no frame; a hairline only
  // when the block is the paper's own white, so its edge still shows.
  const edge = contrastRatio(background, PAPER) < 1.08;
  return (
    <figure className={`m-0 flex min-h-0 flex-col ${className}`} style={{ gap: u(0.8), ...style }}>
      {label === undefined ? null : <Label>{label}</Label>}
      <div
        className="relative grid min-h-0 flex-1 place-items-center overflow-hidden"
        style={{
          background,
          boxShadow: edge
            ? `inset 0 0 0 1px color-mix(in oklch, ${ink} 16%, transparent)`
            : undefined,
        }}
      >
        {children}
      </div>
    </figure>
  );
}

function LogoOverview({
  context,
  only,
}: {
  readonly context: SheetContext;
  /** The versions alone, large (the variants page), instead of the primary logo above them. */
  readonly only: boolean;
}) {
  const { view, words } = context;
  const ink = inkOn(PAPER);
  const review = (kind: 'mono-black' | 'mono-white'): string =>
    view.needsReview.includes(kind) ? ` · ${words.logo.review}` : '';
  const black = view.logo['mono-black'];
  const white = view.logo['mono-white'];
  // R5: the official versions — colour, black, white, one brand colour, reversed out of the primary.
  const tint = useTintedLogo(black, view.colors.primary);
  const versions: readonly {
    readonly key: string;
    readonly background: string;
    readonly src: string | null;
    readonly label: string;
  }[] =
    black !== null && white !== null
      ? [
          {
            key: 'reversed',
            background: view.colors.primary,
            src: white,
            label: words.logo.reversed,
          },
          {
            key: 'white',
            background: view.colors.neutralDark,
            src: white,
            label: `${words.logo.white}${review('mono-white')}`,
          },
          {
            key: 'black',
            background: '#FFFFFF',
            src: black,
            label: `${words.logo.black}${review('mono-black')}`,
          },
          { key: 'tint', background: view.colors.neutralLight, src: tint, label: words.logo.tint },
        ]
      : [
          {
            key: 'light',
            background: view.colors.neutralLight,
            src: view.logo.color,
            label: words.logo.onLight,
          },
          { key: 'white', background: '#FFFFFF', src: view.logo.color, label: words.logo.onColor },
        ];
  return (
    <SheetFrame context={context} lead={words.lead.logo} wide>
      <div
        className={`grid h-full ${only ? 'grid-rows-1' : 'grid-rows-[1.55fr_1fr]'}`}
        style={{ gap: u(2.6) }}
      >
        {only ? null : (
          <figure className="m-0 flex min-h-0 flex-col" style={{ gap: u(0.8) }}>
            <Label>{words.logo.primary}</Label>
            <div className="grid min-h-0 flex-1 place-items-center">
              <LogoImage src={view.logo.color} alt={view.name} className="h-[70%] w-[56%]" />
            </div>
          </figure>
        )}
        <div
          className="grid min-h-0"
          style={{ gridTemplateColumns: `repeat(${String(versions.length)}, minmax(0, 1fr))` }}
        >
          {versions.map((version) => (
            <Tile key={version.key} background={version.background} ink={ink} label={version.label}>
              {version.src === null ? null : (
                <LogoImage src={version.src} className="h-[52%] w-[74%]" />
              )}
            </Tile>
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

// The drawing's own proportions: its box, its axes and its width to height ratio (no redrawing, R1).
function Construction({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const measured = useImageAspect(view.logo.color);
  const aspect = typeof measured === 'number' ? measured : 2;
  const ink = inkOn(context.background ?? PAPER);
  const guide = `color-mix(in oklch, ${view.colors.accent} 70%, ${ink})`;
  const line = { background: guide, position: 'absolute' } as const;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.logo}
      aside={
        <div>
          <Label>{words.logo.proportions}</Label>
          <p className="tabular m-0" style={{ fontSize: u(2.2), marginTop: u(0.6) }}>
            {aspect.toFixed(2)} : 1
          </p>
        </div>
      }
    >
      <div className="relative grid h-full place-items-center" style={{ containerType: 'size' }}>
        <div
          className="relative"
          style={{ aspectRatio: String(aspect), width: `min(88cqw, ${String(74 * aspect)}cqh)` }}
        >
          <div className="absolute inset-0 border border-dashed" style={{ borderColor: guide }} />
          <span style={{ ...line, left: '50%', top: 0, bottom: 0, width: 1 }} />
          <span style={{ ...line, top: '50%', left: 0, right: 0, height: 1 }} />
          <LogoImage src={view.logo.color} alt={view.name} className="absolute inset-0 size-full" />
        </div>
      </div>
    </SheetFrame>
  );
}

// The logo on each brand field, version chosen to read on it, laid directly on the flat colour.
function Usages({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(PAPER);
  const { neutralLight, neutralDark, primary, accent } = view.colors;
  const fields = [
    { key: 'light', background: neutralLight, label: words.logo.onLight, neutral: true },
    { key: 'dark', background: neutralDark, label: words.logo.onDark, neutral: false },
    { key: 'primary', background: primary, label: words.logo.reversed, neutral: false },
    { key: 'accent', background: accent, label: words.logo.onAccent, neutral: false },
  ];
  return (
    <SheetFrame context={context} lead={words.lead.logo} wide>
      <div className="grid h-full grid-cols-4" style={{ gap: u(1) }}>
        {fields.map((field) => (
          <Tile key={field.key} background={field.background} ink={ink} label={field.label}>
            <LogoImage
              src={logoOn(view, field.background, field.neutral)}
              className="h-[40%] w-[72%]"
            />
          </Tile>
        ))}
      </div>
    </SheetFrame>
  );
}

export function LogoPage({ context }: { readonly context: SheetContext }) {
  const shown = logoView(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  if (shown.kind === 'construction') return <Construction context={context} />;
  if (shown.kind === 'usages') return <Usages context={context} />;
  return <LogoOverview context={context} only={shown.kind === 'variants'} />;
}
