'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { contrastRatio, inkOn, isDark } from '../../brand/color';
import { svgDataUrl, tintSvg } from '../../brand/logo-tint';
import type { BrandView } from '../workspace/brand-view';
import type { SheetWords } from './sheet-words';

// Frame of a guideline page (DESIGN.md "Guideline Sheet"): an A4 landscape sheet by default, A4 portrait on
// request. Every size is a multiple of --u, one hundredth of the sheet width in landscape and a larger step in
// portrait, so the same page reads at any zoom of the canvas, in print and in the PDF.
export const u = (value: number): string => `calc(var(--u) * ${String(value)})`;

export const PAPER = '#FFFFFF';

export interface SheetContext {
  readonly view: BrandView;
  readonly words: SheetWords;
  readonly number: number;
  readonly total: number;
  readonly portrait: boolean;
  readonly title: string;
  readonly background: string | undefined;
  readonly year: number;
}

/** Ink of the sheet: the brand's dark neutral when it reads on the paper, near-black otherwise. */
export function sheetInk(view: BrandView, paper: string): string {
  return contrastRatio(view.colors.neutralDark, paper) >= 7
    ? view.colors.neutralDark
    : inkOn(paper);
}

export function SheetFrame({
  context,
  children,
  lead,
  aside,
  bleed = false,
  wide = false,
  className = '',
}: {
  readonly context: SheetContext;
  readonly children: ReactNode;
  /** One sentence beside the content: what the page is for. */
  readonly lead?: string;
  readonly aside?: ReactNode;
  /** Full-bleed pages (cover, dividers) draw their own layout inside the frame. */
  readonly bleed?: boolean;
  /** Narrower text column (2 of 12) for pages whose content needs the width. */
  readonly wide?: boolean;
  readonly className?: string;
}) {
  const { view, portrait } = context;
  const paper = context.background ?? PAPER;
  const ink = sheetInk(view, paper);
  const style: CSSProperties & Record<'--u', string> = {
    '--u': portrait ? '1.42cqw' : '1cqw',
    background: paper,
    color: ink,
    fontFamily: view.pairing.text.css,
  };
  // The page of a printed guideline (references: État, Data Terra, Slack, Nevers): white paper, a hairline
  // and a small section title at the top, the content set in wide margins, folio at the foot. No boxes.
  return (
    <article
      className={`@container relative w-full overflow-hidden ${portrait ? 'aspect-[210/297]' : 'aspect-[297/210]'} ${className}`}
      style={style}
    >
      {bleed ? (
        children
      ) : (
        <div
          className="absolute inset-0 flex flex-col"
          style={{ padding: `${u(4.2)} ${u(portrait ? 5.5 : 5)} ${u(3)}` }}
        >
          <SectionHead context={context} ink={ink} />
          <div
            className={`grid min-h-0 flex-1 ${portrait ? 'grid-rows-[auto_1fr]' : 'grid-cols-12'}`}
            style={{ gap: u(portrait ? 2.4 : 2.6), paddingTop: u(portrait ? 2.6 : 3.2) }}
          >
            {lead === undefined && aside === undefined ? null : (
              <div
                className={`flex min-w-0 flex-col ${portrait ? '' : wide ? 'col-span-2' : 'col-span-3'}`}
              >
                {lead === undefined ? null : <Lead>{lead}</Lead>}
                {aside === undefined ? null : (
                  <div className="mt-auto" style={{ paddingTop: u(2) }}>
                    {aside}
                  </div>
                )}
              </div>
            )}
            <div
              className={`relative min-h-0 min-w-0 ${portrait ? '' : lead === undefined && aside === undefined ? 'col-span-12' : wide ? 'col-span-10' : 'col-span-9'}`}
            >
              {children}
            </div>
          </div>
          <Folio context={context} />
        </div>
      )}
      <span className="sr-only">{context.words.guideline}</span>
    </article>
  );
}

const SMALL_CAPS: CSSProperties = {
  fontSize: u(0.82),
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

function SectionHead({ context, ink }: { readonly context: SheetContext; readonly ink: string }) {
  return (
    <header style={{ borderTop: `1px solid color-mix(in oklch, ${ink} 30%, transparent)` }}>
      <h2
        className="m-0"
        style={{
          ...SMALL_CAPS,
          fontSize: u(0.95),
          fontWeight: 700,
          paddingTop: u(1.1),
          fontFamily: context.view.pairing.text.css,
        }}
      >
        {context.title}
      </h2>
    </header>
  );
}

function Folio({ context }: { readonly context: SheetContext }) {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    <footer
      className="flex items-baseline justify-between"
      style={{ ...SMALL_CAPS, fontSize: u(0.72), opacity: 0.55, paddingTop: u(1.4) }}
    >
      <span className="truncate">
        {context.view.name} · {context.words.guideline}
      </span>
      <span className="tabular shrink-0">{pad(context.number)}</span>
    </footer>
  );
}

function Lead({ children }: { readonly children: ReactNode }) {
  return (
    <p
      className="m-0 text-pretty"
      style={{ fontSize: u(1.05), lineHeight: 1.55, opacity: 0.78, maxWidth: '30ch' }}
    >
      {children}
    </p>
  );
}

/** Small uppercase label above a block (the printed guideline's "SUR FOND FONCÉ"). */
export function Label({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}) {
  return <span style={{ ...SMALL_CAPS, fontWeight: 600, ...style }}>{children}</span>;
}

/** Small label of a measured value, tabular figures in the brand's text face (as printed guidelines do). */
export function Measure({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}) {
  return (
    <span className="tabular" style={{ fontSize: u(0.9), letterSpacing: '0.02em', ...style }}>
      {children}
    </span>
  );
}

/** Logo image of the brand; empty alt when the page already names it. */
export function LogoImage({
  src,
  alt = '',
  className = '',
  style,
}: {
  readonly src: string;
  readonly alt?: string;
  readonly className?: string;
  readonly style?: CSSProperties | undefined;
}) {
  return (
    // Stored, sanitised logo files served by our own API: next/image would re-encode the logo.
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      className={`block object-contain select-none ${className}`}
      style={style}
    />
  );
}

/**
 * The black monochrome variant repainted in a brand colour (a data: URL), or null while it loads, when
 * the project has no monochrome variant or when the file does not load.
 */
export function useTintedLogo(mono: string | null, hex: string): string | null {
  const [tinted, setTinted] = useState<{ readonly key: string; readonly url: string } | null>(null);
  const key = `${mono ?? ''}|${hex}`;
  useEffect(() => {
    if (mono === null) return;
    let alive = true;
    void fetch(mono)
      .then((response) => (response.ok ? response.text() : null))
      .then((svg) => {
        const painted = svg === null ? null : tintSvg(svg, hex);
        if (alive && painted !== null) setTinted({ key, url: svgDataUrl(painted) });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [mono, hex, key]);
  return tinted?.key === key ? tinted.url : null;
}

/** Logo version that reads on a background: white on dark, black on light colour, colour otherwise. */
export function logoOn(view: BrandView, background: string, neutral = false): string {
  // A brand field takes the mark reversed in white as soon as it holds at 2.2:1 (a mark, not body text).
  if (isDark(background) || contrastRatio('#FFFFFF', background) >= 2.2)
    return view.logo['mono-white'] ?? view.logo.color;
  if (!neutral) return view.logo['mono-black'] ?? view.logo.color;
  return view.logo.color;
}

/**
 * Width / height of an image once loaded (the clear-space drawing and the mockups need the logo's real
 * proportions); 'failed' when the file does not load, so callers can say so instead of drawing nothing.
 */
export function useImageAspect(src: string): number | 'failed' | null {
  const [aspect, setAspect] = useState<{
    readonly src: string;
    readonly value: number | 'failed';
  } | null>(null);
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      setAspect({
        src,
        value:
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? image.naturalWidth / image.naturalHeight
            : 'failed',
      });
    };
    image.onerror = () => {
      if (alive) setAspect({ src, value: 'failed' });
    };
    image.src = src;
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);
  return aspect !== null && aspect.src === src ? aspect.value : null;
}
