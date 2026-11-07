'use client';

import type { CSSProperties, ReactNode } from 'react';
import { contrastRatio, inkOn } from '../../brand/color';
import { LogoImage, PAPER, SheetFrame, u, useTintedLogo, Label, type SheetContext } from './sheet';

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

export function LogoPage({ context }: { readonly context: SheetContext }) {
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
      <div className="grid h-full grid-rows-[1.55fr_1fr]" style={{ gap: u(2.6) }}>
        <figure className="m-0 flex min-h-0 flex-col" style={{ gap: u(0.8) }}>
          <Label>{words.logo.primary}</Label>
          <div className="grid min-h-0 flex-1 place-items-center">
            <LogoImage src={view.logo.color} alt={view.name} className="h-[70%] w-[56%]" />
          </div>
        </figure>
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
