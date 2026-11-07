'use client';

import { buildScale, cmykOf, formatOklch, inkOn, rgbOf } from '../../brand/color';
import type { ColorRole } from '../workspace/brand-view';
import { PAPER, SheetFrame, occurrenceOf, u, type SheetContext } from './sheet';
import { hairline } from './common';
import { paletteRoles } from './variant';

const SHARE: Readonly<Record<ColorRole, number>> = {
  primary: 34,
  accent: 24,
  neutralLight: 22,
  neutralDark: 20,
};

const CAPTION = { fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 } as const;

function Scale({ hex, height }: { readonly hex: string; readonly height: number }) {
  return (
    <div className="flex overflow-hidden" style={{ borderRadius: 0 }}>
      {buildScale(hex).map((step) => (
        <span
          key={step.step}
          title={`${String(step.step)} ${step.hex}`}
          className="flex-1"
          style={{ background: step.hex, height: u(height) }}
        />
      ))}
    </div>
  );
}

function ColourField({
  context,
  role,
  ink,
  scale,
}: {
  readonly context: SheetContext;
  readonly role: ColorRole;
  readonly ink: string;
  /** Show the tint scale of the colour under its field (pages devoted to one colour group). */
  readonly scale: boolean;
}) {
  const { view, words } = context;
  const hex = view.colors[role];
  const [c, m, y, k] = cmykOf(hex);
  return (
    <div
      className="flex min-h-0 min-w-0 flex-col"
      style={{ flex: scale ? 1 : SHARE[role], gap: u(0.8) }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden border"
        style={{
          background: hex,
          color: inkOn(hex),
          borderRadius: 0,
          padding: u(1.4),
          ...hairline(ink),
        }}
      >
        <div>
          <p
            className="m-0"
            style={{ fontFamily: view.pairing.display.css, fontSize: u(1.8), fontWeight: 600 }}
          >
            {words.roles[role]}
          </p>
          <p className="m-0" style={{ fontSize: u(0.95), opacity: 0.8, marginTop: u(0.4) }}>
            {words.usage[role]}
          </p>
        </div>
        <dl
          className="tabular m-0 grid grid-cols-[auto_1fr]"
          style={{ fontSize: u(0.8), columnGap: u(0.6), rowGap: u(0.2), lineHeight: 1.35 }}
        >
          <dt style={{ opacity: 0.82 }}>HEX</dt>
          <dd className="m-0">{hex}</dd>
          <dt style={{ opacity: 0.82 }}>RVB</dt>
          <dd className="m-0">{rgbOf(hex).join(' ')}</dd>
          <dt style={{ opacity: 0.82 }}>OKLCH</dt>
          <dd className="m-0 truncate">{formatOklch(hex)}</dd>
          <dt style={{ opacity: 0.82 }}>CMJN</dt>
          <dd className="m-0">{[c, m, y, k].join(' ')}</dd>
        </dl>
      </div>
      {scale ? (
        <div>
          <p className="m-0 uppercase" style={{ ...CAPTION, marginBottom: u(0.6) }}>
            {words.palette.scaleOf(words.roles[role])}
          </p>
          <Scale hex={hex} height={4} />
        </div>
      ) : null}
    </div>
  );
}

// A charter with one palette page shows the four roles in their proportions. With several, each page is
// about one colour group (primary, accent, neutrals) and adds the tint scale of every colour it shows.
export function Palette({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const roles = paletteRoles(occurrenceOf(context));
  const focused = roles.length < 4;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.palette}
      aside={
        <div>
          {focused ? null : (
            <>
              <p className="m-0 uppercase" style={CAPTION}>
                {words.palette.scale}
              </p>
              <div style={{ marginTop: u(0.8) }}>
                <Scale hex={view.colors.primary} height={3} />
              </div>
            </>
          )}
          <p className="m-0" style={{ fontSize: u(0.85), opacity: 0.6, marginTop: u(0.8) }}>
            {words.palette.cmykNote}
          </p>
        </div>
      }
    >
      <div className="flex h-full" style={{ gap: u(1) }}>
        {roles.map((role) => (
          <ColourField key={role} context={context} role={role} ink={ink} scale={focused} />
        ))}
      </div>
    </SheetFrame>
  );
}
