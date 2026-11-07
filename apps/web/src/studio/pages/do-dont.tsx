'use client';

import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { inkOn, isDark } from '../../brand/color';
import { LogoImage, PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { hairline } from './common';

interface Misuse {
  readonly key: string;
  readonly label: string;
  readonly ok?: boolean;
  readonly background?: string;
  readonly art?: CSSProperties;
  readonly busy?: boolean;
  readonly crowd?: boolean;
}

export function DoDont({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const light = view.colors.neutralLight;
  // A background close to the logo's own colour: the classic low-contrast misuse.
  const clash = isDark(view.colors.primary) ? view.colors.neutralDark : view.colors.accent;
  const panels: readonly Misuse[] = [
    { key: 'ok', label: words.dont.correct, ok: true },
    { key: 'stretch', label: words.dont.stretch, art: { transform: 'scaleX(1.45)' } },
    { key: 'rotate', label: words.dont.rotate, art: { transform: 'rotate(-14deg)' } },
    {
      key: 'recolor',
      label: words.dont.recolor,
      art: { filter: 'hue-rotate(150deg) saturate(1.4)' },
    },
    {
      key: 'effect',
      label: words.dont.effect,
      art: { filter: 'drop-shadow(0.4em 0.5em 0.25em rgb(0 0 0 / 0.55))' },
    },
    { key: 'contrast', label: words.dont.lowContrast, background: clash },
    { key: 'busy', label: words.dont.busy, busy: true },
    { key: 'crowd', label: words.dont.crowd, crowd: true },
  ];
  return (
    <SheetFrame context={context} lead={words.lead.doDont} wide>
      <div className="grid h-full grid-cols-4 grid-rows-2" style={{ gap: u(1.2) }}>
        {panels.map((panel) => (
          <figure key={panel.key} className="m-0 flex min-h-0 flex-col" style={{ gap: u(0.6) }}>
            <div
              className="relative grid min-h-0 flex-1 place-items-center overflow-hidden border"
              style={{
                borderRadius: 0,
                background: panel.busy
                  ? `repeating-linear-gradient(135deg, ${view.colors.primary} 0 ${u(0.8)}, ${view.colors.accent} ${u(0.8)} ${u(1.6)}, ${light} ${u(1.6)} ${u(2.4)})`
                  : (panel.background ?? light),
                ...hairline(ink),
              }}
            >
              <LogoImage src={view.logo.color} className="h-[46%] w-[66%]" style={panel.art} />
              {panel.crowd ? (
                <span
                  className="absolute"
                  style={{ fontSize: u(0.95), color: inkOn(light), left: '18%', top: '30%' }}
                >
                  {words.dont.crowdText}
                </span>
              ) : null}
              <span
                className="absolute grid place-items-center rounded-full"
                style={{
                  right: u(0.7),
                  top: u(0.7),
                  width: u(2),
                  height: u(2),
                  background: panel.ok === true ? '#1E7F4F' : '#C62828',
                  color: '#FFFFFF',
                }}
              >
                {panel.ok === true ? (
                  <Check aria-hidden="true" style={{ width: u(1.2), height: u(1.2) }} />
                ) : (
                  <X aria-hidden="true" style={{ width: u(1.2), height: u(1.2) }} />
                )}
              </span>
            </div>
            <figcaption style={{ fontSize: u(0.95), lineHeight: 1.25 }}>{panel.label}</figcaption>
          </figure>
        ))}
      </div>
    </SheetFrame>
  );
}
