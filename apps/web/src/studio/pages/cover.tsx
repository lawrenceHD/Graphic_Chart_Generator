'use client';

import { contrastRatio, inkOn } from '../../brand/color';
import { LogoImage, SheetFrame, logoOn, u, Label, type SheetContext } from './sheet';

export function Cover({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  // A one-colour version still to check never stands in for the logo on the cover: the field turns to
  // the light neutral and carries the upload itself, directly, without a plate.
  const field =
    context.background ??
    (view.needsReview.length > 0 ? view.colors.neutralLight : view.colors.primary);
  const ink = inkOn(field);
  const logo =
    view.needsReview.length > 0 && context.background === undefined
      ? view.logo.color
      : logoOn(view, field, true);
  const accent = contrastRatio(view.colors.accent, field) >= 3 ? view.colors.accent : ink;
  return (
    <SheetFrame context={{ ...context, background: field }} bleed>
      <div
        className="absolute inset-0 flex flex-col"
        style={{ padding: `${u(5)} ${u(6)}`, color: ink, fontFamily: view.pairing.text.css }}
      >
        {/* The mark sits on the start side and large, as the lead object of the cover, never in a plate. */}
        <div className="flex min-h-0 flex-1 items-center justify-start">
          <LogoImage src={logo} alt={view.name} className="h-[64%] w-[64%] object-left" />
        </div>
        <div
          className="flex items-end justify-between"
          style={{
            borderTop: `1px solid color-mix(in oklch, ${ink} 35%, transparent)`,
            paddingTop: u(1.4),
          }}
        >
          <Label style={{ fontSize: u(0.95) }}>
            <span style={{ color: accent }}>{words.guideline}</span>{' '}
            <span className="tabular" style={{ opacity: 0.75 }}>
              {words.edition(context.year)}
            </span>
          </Label>
          <Label style={{ fontSize: u(0.95), opacity: 0.75 }}>{view.name}</Label>
        </div>
      </div>
    </SheetFrame>
  );
}
