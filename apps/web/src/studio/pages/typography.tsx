'use client';

import { contrastRatio, inkOn } from '../../brand/color';
import { Measure, PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { hairline } from './common';

export function Typography({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const sizes = [
    { label: words.type.h1, size: 4.6, weight: 700, font: view.pairing.display.css },
    { label: words.type.h2, size: 2.8, weight: 600, font: view.pairing.display.css },
    { label: words.type.body, size: 1.35, weight: 400, font: view.pairing.text.css },
    { label: words.type.caption, size: 1, weight: 500, font: view.pairing.text.css },
  ];
  return (
    <SheetFrame
      context={context}
      lead={words.lead.typography}
      aside={
        <div className="flex flex-col" style={{ gap: u(1.4) }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: view.pairing.display.css,
              fontSize: u(10),
              lineHeight: 0.8,
              color:
                contrastRatio(view.colors.primary, PAPER) >= 2
                  ? view.colors.primary
                  : view.colors.neutralDark,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            Aa
          </span>
          {[
            { family: view.pairing.display, role: words.type.display },
            { family: view.pairing.text, role: `${words.type.text} · ${words.type.licence}` },
          ].map(({ family, role }) => (
            <div key={role} className="border-t" style={{ ...hairline(ink), paddingTop: u(0.8) }}>
              <p
                className="m-0"
                style={{
                  fontFamily: family.css,
                  fontSize: u(1.6),
                  fontWeight: 600,
                  lineHeight: 1.15,
                }}
              >
                {family.name}
              </p>
              <Measure style={{ opacity: 0.62 }}>{role}</Measure>
            </div>
          ))}
        </div>
      }
    >
      <div className="flex h-full flex-col justify-between">
        {sizes.map((size) => (
          <div
            key={size.label}
            className="grid grid-cols-[auto_1fr] items-baseline border-t"
            style={{ ...hairline(ink), gap: u(2), paddingTop: u(1) }}
          >
            <Measure style={{ opacity: 0.6, width: u(9), display: 'inline-block' }}>
              {size.label}
            </Measure>
            <p
              className="m-0 truncate"
              style={{
                fontFamily: size.font,
                fontSize: u(size.size),
                fontWeight: size.weight,
                lineHeight: 1.1,
                letterSpacing: size.size > 2 ? '-0.02em' : '0',
              }}
            >
              {size.size > 2 ? view.name : words.type.sample}
            </p>
          </div>
        ))}
        <p
          className="m-0 border-t"
          style={{
            ...hairline(ink),
            fontSize: u(1),
            opacity: 0.7,
            paddingTop: u(1),
            letterSpacing: '0.04em',
          }}
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 àâçéèêëîïôûù
        </p>
      </div>
    </SheetFrame>
  );
}
