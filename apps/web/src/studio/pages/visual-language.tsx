'use client';

import { inkOn } from '../../brand/color';
import { MotifGrid } from './art/mark';
import { hairline } from './common';
import { Label, PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { SECTION_WORDS } from './section-words';

const COLS = 6;
const ROWS = 4;

// Visual language (AGR p6, POR « A Malha », INS p75): the pattern drawn from the logo, what is fixed and
// what is free. Photography and illustration have no data yet: the page says so instead of inventing them.
export function VisualLanguage({ context }: { readonly context: SheetContext }) {
  const words = SECTION_WORDS[context.view.language].pattern;
  const ink = inkOn(context.background ?? PAPER);
  const rules = [
    { key: 'fixed', label: words.fixed, text: words.fixedText },
    { key: 'free', label: words.free, text: words.freeText },
    { key: 'imagery', label: words.imagery, text: words.imageryText },
  ];
  return (
    <SheetFrame
      context={context}
      lead={words.lead}
      aside={
        <div className="flex flex-col" style={{ gap: u(1) }}>
          {rules.map((rule) => (
            <div
              key={rule.key}
              className="border-t"
              style={{ ...hairline(ink), paddingTop: u(0.7) }}
            >
              <Label>{rule.label}</Label>
              <p
                className="m-0 text-pretty"
                style={{ fontSize: u(0.92), lineHeight: 1.4, marginTop: u(0.3), opacity: 0.8 }}
              >
                {rule.text}
              </p>
            </div>
          ))}
        </div>
      }
    >
      <div className="grid h-full place-items-center" style={{ containerType: 'size' }}>
        <div
          style={{
            aspectRatio: `${String(COLS)} / ${String(ROWS)}`,
            width: `min(100cqw, ${String((100 * COLS) / ROWS)}cqh)`,
          }}
        >
          <MotifGrid view={context.view} kind="repeat" cols={COLS} rows={ROWS} />
        </div>
      </div>
    </SheetFrame>
  );
}
