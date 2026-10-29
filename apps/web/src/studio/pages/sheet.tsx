'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { contrastRatio, inkOn, isDark } from '../../brand/color';
import type { BrandView } from '../workspace/brand-view';
import type { SheetWords } from './sheet-words';

// Frame of a guideline page (DESIGN.md "Guideline Sheet"): a 16:9 landscape sheet by default, A4 portrait on
// request. Every size is a multiple of --u, one hundredth of the sheet width in landscape and a larger step in
// portrait, so the same page reads at any zoom of the canvas, in print and in the PDF.
export const u = (value: number): string => `calc(var(--u) * ${String(value)})`;

export const PAPER = '#FBFBF9';

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
  /** One sentence under the title: what the page is for. */
  readonly lead?: string;
  readonly aside?: ReactNode;
  /** Full-bleed pages (cover) draw their own layout inside the frame. */
  readonly bleed?: boolean;
  /** Narrower title column (3 of 12) for pages whose content needs the width. */
  readonly wide?: boolean;
  readonly className?: string;
}) {
  const { view, words, portrait } = context;
  const paper = context.background ?? PAPER;
  const ink = sheetInk(view, paper);
  const style: CSSProperties & Record<'--u', string> = {
    '--u': portrait ? '1.42cqw' : '1cqw',
    background: paper,
    color: ink,
    fontFamily: view.pairing.text.css,
  };
  return (
    <article
      className={`@container relative w-full overflow-hidden ${portrait ? 'aspect-[210/297]' : 'aspect-[16/9]'} ${className}`}
      style={{ ...style, borderRadius: u(1.2) }}
    >
      {bleed ? (
        children
      ) : (
        <div className="absolute inset-0 flex flex-col" style={{ padding: u(4) }}>
          <RunningHeader context={context} ink={ink} />
          <div
            className={`grid min-h-0 flex-1 ${portrait ? 'grid-rows-[auto_1fr]' : 'grid-cols-12'}`}
            style={{ gap: u(portrait ? 3 : 2.6), paddingTop: u(portrait ? 3.4 : 3) }}
          >
            <div
              className={`flex min-w-0 flex-col ${portrait ? '' : wide ? 'col-span-3' : 'col-span-4'}`}
            >
              <h2
                className="m-0 text-balance"
                style={{
                  fontFamily: view.pairing.display.css,
                  fontSize: u(portrait ? 6 : 4.4),
                  lineHeight: 0.95,
                  letterSpacing: '-0.025em',
                  fontWeight: 650,
                }}
              >
                {context.title}
              </h2>
              {lead === undefined ? null : <Lead>{lead}</Lead>}
              {aside === undefined ? null : (
                <div className="mt-auto" style={{ paddingTop: u(2) }}>
                  {aside}
                </div>
              )}
            </div>
            <div
              className={`relative min-h-0 min-w-0 ${portrait ? '' : wide ? 'col-span-9' : 'col-span-8'}`}
            >
              {children}
            </div>
          </div>
        </div>
      )}
      <span className="sr-only">{words.guideline}</span>
    </article>
  );
}

function RunningHeader({ context, ink }: { readonly context: SheetContext; readonly ink: string }) {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return (
    <header
      className="flex items-baseline justify-between font-mono uppercase"
      style={{ fontSize: u(0.95), letterSpacing: '0.14em', color: ink, opacity: 0.62 }}
    >
      <span className="truncate">
        {context.view.name} — {context.words.guideline}
      </span>
      <span className="tabular shrink-0">
        {pad(context.number)} / {pad(context.total)}
      </span>
    </header>
  );
}

function Lead({ children }: { readonly children: ReactNode }) {
  return (
    <p
      className="m-0 text-pretty"
      style={{
        fontSize: u(1.32),
        lineHeight: 1.45,
        opacity: 0.72,
        marginTop: u(1.6),
        maxWidth: '34ch',
      }}
    >
      {children}
    </p>
  );
}

/** Small mono label of a measured value (DESIGN.md: the evidence is mono). */
export function Measure({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: CSSProperties;
}) {
  return (
    <span className="tabular font-mono" style={{ fontSize: u(0.95), ...style }}>
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

/** Logo version that reads on a background: white on dark, black on light colour, colour otherwise. */
export function logoOn(view: BrandView, background: string, neutral = false): string {
  if (isDark(background)) return view.logo['mono-white'] ?? view.logo.color;
  if (!neutral) return view.logo['mono-black'] ?? view.logo.color;
  return view.logo.color;
}

/** Width / height of an image once loaded (the clear-space drawing needs the logo's real proportions). */
export function useImageAspect(src: string): number | null {
  const [aspect, setAspect] = useState<{ readonly src: string; readonly value: number } | null>(
    null,
  );
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (alive && image.naturalWidth > 0 && image.naturalHeight > 0)
        setAspect({ src, value: image.naturalWidth / image.naturalHeight });
    };
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return aspect !== null && aspect.src === src ? aspect.value : null;
}
