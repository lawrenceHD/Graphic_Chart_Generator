'use client';

import type { CSSProperties, ReactNode } from 'react';
import { inkOn } from '../../../brand/color';
import { SheetFrame, u, type SheetContext } from '../sheet';
import { evidenceLine } from '../variant';

// Type scale of the sheets, in sheet units (u = one hundredth of the width). Measured on Instacart,
// Slack and BlaBlaCar (docs/team/charter/PAGE-ARCHETYPES.md): each level is about twice the one below.
export const T = {
  word: 15,
  title: 5.2,
  sub: 2.2,
  body: 1.05,
  caption: 0.78,
  folio: 0.72,
} as const;

/** Margins of the sheet, in u: side, top (to the rule) and foot. */
export const M = { side: 5, top: 3.4, foot: 3 } as const;

export const caps = (size: number = T.caption): CSSProperties => ({
  fontSize: u(size),
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  lineHeight: 1.3,
});

/**
 * Rule, section title and brand at the head, folio and proof at the foot, in the ink that reads on the
 * page's field. Laid over the page so the content can bleed under it.
 */
export function Chrome({
  context,
  ink,
  title = context.title,
  box = { left: M.side, right: M.side },
}: {
  readonly context: SheetContext;
  readonly ink: string;
  readonly title?: string;
  /** Where head and foot run, in u from each edge (a page whose right part is a picture keeps them left). */
  readonly box?: { readonly left: number; readonly right: number };
}) {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const proof = evidenceLine(context.words.evidence, context.evidence ?? []);
  const rule = `1px solid color-mix(in oklch, ${ink} 38%, transparent)`;
  return (
    <>
      <header
        className="pointer-events-none absolute flex items-baseline justify-between"
        style={{
          ...caps(),
          color: ink,
          left: u(box.left),
          right: u(box.right),
          top: u(M.top),
          borderTop: rule,
          paddingTop: u(0.9),
          gap: u(2),
        }}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="shrink-0" style={{ opacity: 0.7 }}>
          {context.view.name}
        </span>
      </header>
      <footer
        className="pointer-events-none absolute flex items-baseline justify-between"
        style={{
          ...caps(T.folio),
          color: ink,
          left: u(box.left),
          right: u(box.right),
          bottom: u(M.foot),
          gap: u(2),
          opacity: 0.7,
        }}
      >
        <span className="shrink-0">{context.words.guideline}</span>
        {proof === null ? null : (
          <span
            className="min-w-0 flex-1 truncate text-right normal-case"
            style={{ letterSpacing: '0.02em', fontWeight: 400 }}
          >
            {proof}
          </span>
        )}
        <span className="tabular shrink-0">
          {pad(context.number)} / {pad(context.total)}
        </span>
      </footer>
    </>
  );
}

/** A page drawn edge to edge on one field, with the printer's head and foot over it. */
export function FullPage({
  context,
  field,
  children,
  chrome = true,
  box,
}: {
  readonly context: SheetContext;
  readonly field: string;
  readonly children: ReactNode;
  readonly chrome?: boolean;
  readonly box?: { readonly left: number; readonly right: number };
}) {
  const ink = inkOn(field);
  return (
    <SheetFrame context={{ ...context, background: field }} bleed>
      <div className="absolute inset-0">{children}</div>
      {chrome ? (
        <Chrome context={context} ink={ink} {...(box === undefined ? {} : { box })} />
      ) : null}
    </SheetFrame>
  );
}
