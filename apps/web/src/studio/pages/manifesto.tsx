'use client';

import { inkOn } from '../../brand/color';
import { briefLead } from '../workspace/brand-view';
import { PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { hairline } from './common';

export function Manifesto({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  if (!view.written) {
    const quote = briefLead(view.brief, 320);
    return (
      <SheetFrame context={context} lead={words.lead.manifesto}>
        <div className="flex h-full flex-col justify-center" style={{ gap: u(2.4) }}>
          <p
            className="m-0 uppercase"
            style={{ fontSize: u(0.95), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {quote === null ? words.manifesto.pending : words.manifesto.fromBrief}
          </p>
          <p
            className="m-0 text-balance"
            style={{
              fontFamily: view.pairing.display.css,
              fontSize: u(quote === null ? 3.4 : 2.7),
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
            }}
          >
            {quote === null ? words.manifesto.pending : `« ${quote} »`}
          </p>
          <p
            className="m-0 border-t"
            style={{
              ...hairline(ink),
              fontSize: u(1.15),
              opacity: 0.66,
              paddingTop: u(1.6),
              maxWidth: '52ch',
            }}
          >
            {words.manifesto.pendingNote}
          </p>
        </div>
      </SheetFrame>
    );
  }
  return (
    <SheetFrame context={context} lead={words.lead.manifesto}>
      <div className="flex h-full flex-col" style={{ gap: u(2.4) }}>
        <Statement label={words.manifesto.mission} text={view.mission} context={context} large />
        <Statement label={words.manifesto.vision} text={view.vision} context={context} />
        <div className="mt-auto grid grid-cols-4" style={{ gap: u(1.6) }}>
          {view.values.map((value) => (
            <div
              key={value.label}
              className="border-t"
              style={{ ...hairline(ink), paddingTop: u(1.2) }}
            >
              <p
                className="m-0"
                style={{ fontFamily: view.pairing.display.css, fontSize: u(1.7), fontWeight: 600 }}
              >
                {value.label}
              </p>
              <p className="m-0" style={{ fontSize: u(1.05), opacity: 0.7, marginTop: u(0.6) }}>
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function Statement({
  label,
  text,
  context,
  large = false,
}: {
  readonly label: string;
  readonly text: string;
  readonly context: SheetContext;
  readonly large?: boolean;
}) {
  if (text.trim() === '') return null;
  return (
    <div>
      <p
        className="m-0 uppercase"
        style={{ fontSize: u(0.95), letterSpacing: '0.14em', opacity: 0.6 }}
      >
        {label}
      </p>
      <p
        className="m-0 text-balance"
        style={{
          fontFamily: context.view.pairing.display.css,
          fontSize: u(large ? 2.9 : 1.9),
          lineHeight: 1.12,
          marginTop: u(0.8),
        }}
      >
        {text}
      </p>
    </div>
  );
}
