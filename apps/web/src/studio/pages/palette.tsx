'use client';

import { buildScale, cmykOf, formatOklch, inkOn, rgbOf } from '../../brand/color';
import { COLOR_ROLES, type ColorRole } from '../workspace/brand-view';
import { PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { hairline } from './common';

const SHARE: Readonly<Record<ColorRole, number>> = {
  primary: 34,
  accent: 24,
  neutralLight: 22,
  neutralDark: 20,
};

export function Palette({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  return (
    <SheetFrame
      context={context}
      lead={words.lead.palette}
      aside={
        <div>
          <p
            className="m-0 uppercase"
            style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {words.palette.scale}
          </p>
          <div className="flex overflow-hidden" style={{ marginTop: u(0.8), borderRadius: 0 }}>
            {buildScale(view.colors.primary).map((step) => (
              <span
                key={step.step}
                title={`${String(step.step)} ${step.hex}`}
                className="flex-1"
                style={{ background: step.hex, height: u(3) }}
              />
            ))}
          </div>
          <p className="m-0" style={{ fontSize: u(0.85), opacity: 0.6, marginTop: u(0.8) }}>
            {words.palette.cmykNote}
          </p>
        </div>
      }
    >
      <div className="flex h-full" style={{ gap: u(1) }}>
        {COLOR_ROLES.map((role) => {
          const hex = view.colors[role];
          const on = inkOn(hex);
          const [c, m, y, k] = cmykOf(hex);
          return (
            <div
              key={role}
              className="flex min-w-0 flex-col justify-between overflow-hidden border"
              style={{
                flex: SHARE[role],
                background: hex,
                color: on,
                borderRadius: 0,
                padding: u(1.4),
                ...hairline(ink),
              }}
            >
              <div>
                <p
                  className="m-0"
                  style={{
                    fontFamily: view.pairing.display.css,
                    fontSize: u(1.8),
                    fontWeight: 600,
                  }}
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
          );
        })}
      </div>
    </SheetFrame>
  );
}
