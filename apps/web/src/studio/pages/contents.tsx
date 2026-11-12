'use client';

import type { GuidelineSection } from '@app/contracts';
import { inkOn } from '../../brand/color';
import { hairline } from './common';
import { Label, PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { SECTION_WORDS } from './section-words';

// The rules every producer must follow: the pages the contents sends them to.
const REQUIRED: readonly GuidelineSection[] = [
  'logo',
  'logo-variants',
  'clear-space',
  'misuse',
  'palette',
  'color-ratio',
  'typography',
  'type-hierarchy',
];

const pad = (value: number): string => String(value).padStart(2, '0');

// A real contents page (INS p3, CAP p2): every page of the guideline with its number, then how to use the
// guideline (UNV p3, CAP p4, ETA p3): who it is for, what is required, what is free, where the files are.
export function Contents({ context }: { readonly context: SheetContext }) {
  const { view, year } = context;
  const words = SECTION_WORDS[view.language].contents;
  const ink = inkOn(context.background ?? PAPER);
  const outline = view.outline ?? [];
  const required = outline.flatMap((entry, index) =>
    entry.section !== null && REQUIRED.includes(entry.section) ? [index + 1] : [],
  );
  const blocks = [
    { key: 'required', label: words.required, text: words.requiredText(words.pages(required)) },
    { key: 'free', label: words.free, text: words.freeText },
    { key: 'files', label: words.files, text: words.filesText },
    { key: 'edition', label: words.edition, text: context.words.edition(year) },
  ];
  return (
    <SheetFrame context={context} lead={words.lead}>
      <div className="grid h-full grid-cols-[3fr_2fr]" style={{ gap: u(3) }}>
        <div className="flex min-h-0 flex-col">
          <Label style={{ opacity: 0.6 }}>{words.list}</Label>
          <ol
            className="m-0 list-none p-0"
            style={{ columns: 2, columnGap: u(2.4), marginTop: u(1.2) }}
          >
            {outline.map((entry, index) => (
              <li
                key={`${String(index)}-${entry.title}`}
                className="grid grid-cols-[auto_1fr] items-baseline border-t break-inside-avoid"
                style={{
                  ...hairline(ink),
                  gap: u(1),
                  padding: `${u(0.55)} 0`,
                  fontSize: u(1.02),
                  fontWeight: index + 1 === context.number ? 700 : 400,
                }}
              >
                <span className="tabular" style={{ opacity: 0.55 }}>
                  {pad(index + 1)}
                </span>
                <span className="min-w-0 truncate">{entry.title}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex min-h-0 flex-col" style={{ gap: u(1.4) }}>
          <Label style={{ opacity: 0.6 }}>{words.use}</Label>
          <p
            className="m-0 text-pretty"
            style={{ fontFamily: view.pairing.display.css, fontSize: u(1.7), lineHeight: 1.2 }}
          >
            {words.audience(view.name)}
          </p>
          {blocks.map((block) => (
            <div
              key={block.key}
              className="border-t"
              style={{ ...hairline(ink), paddingTop: u(0.8) }}
            >
              <Label>{block.label}</Label>
              <p
                className="m-0 text-pretty"
                style={{ fontSize: u(1), lineHeight: 1.45, marginTop: u(0.4), opacity: 0.8 }}
              >
                {block.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}
