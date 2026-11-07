'use client';

import { inkOn } from '../../brand/color';
import { PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { hairline } from './common';

export function Tone({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const examples = view.tone.examples.filter((example) => example.trim() !== '');
  return (
    <SheetFrame context={context} lead={words.lead.tone}>
      <div className="flex h-full flex-col" style={{ gap: u(2.2) }}>
        <ul className="m-0 flex list-none flex-col p-0" style={{ gap: u(1.8) }}>
          {view.tone.axes.map((axis) => {
            const [left, right] = words.tone.axes[axis.id];
            return (
              <li key={axis.id}>
                <div className="flex justify-between" style={{ fontSize: u(1.1) }}>
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
                <div
                  className="relative"
                  style={{
                    height: u(0.3),
                    marginTop: u(0.9),
                    background: `color-mix(in oklch, ${ink} 14%, transparent)`,
                    borderRadius: 0,
                  }}
                >
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${String(axis.value)}%`,
                      width: u(1.6),
                      height: u(1.6),
                      background: view.written ? view.colors.primary : 'transparent',
                      border: `${u(0.2)} solid ${view.written ? view.colors.primary : ink}`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {examples.length > 0 ? (
          <div className="mt-auto grid grid-cols-3" style={{ gap: u(1.4) }}>
            {examples.map((example) => (
              <blockquote
                key={example}
                className="m-0 border-t"
                style={{
                  ...hairline(ink),
                  paddingTop: u(1),
                  fontSize: u(1.2),
                  fontFamily: view.pairing.display.css,
                }}
              >
                {example}
              </blockquote>
            ))}
          </div>
        ) : (
          <p
            className="m-0 mt-auto border-t"
            style={{ ...hairline(ink), fontSize: u(1.1), opacity: 0.66, paddingTop: u(1.4) }}
          >
            {words.tone.pending}
          </p>
        )}
      </div>
    </SheetFrame>
  );
}
