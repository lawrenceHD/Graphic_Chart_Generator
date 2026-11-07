'use client';

import { inkOn } from '../../brand/color';
import { COLOR_ROLES, type ColorRole } from '../workspace/brand-view';
import { ratio } from '../workspace/export-files';
import { Measure, SheetFrame, u, type SheetContext } from './sheet';

export function Tokens({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const slug = (role: ColorRole): string =>
    role.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
  const lines = [
    ':root {',
    ...COLOR_ROLES.map((role) => `  --color-${slug(role)}: ${view.colors[role]};`),
    `  --font-display: '${view.pairing.display.name}';`,
    `  --font-text: '${view.pairing.text.name}';`,
    `  --logo-clear-space: ${String(ratio(view.rules.clearSpaceRatio))};`,
    `  --logo-min-size: ${String(view.rules.minSizePx)}px;`,
    '}',
  ];
  const code = view.colors.neutralDark;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.tokens}
      aside={<Measure style={{ opacity: 0.7 }}>{words.tokens.formats}</Measure>}
    >
      <pre
        className="m-0 h-full overflow-hidden"
        style={{
          background: code,
          color: inkOn(code),
          borderRadius: 0,
          padding: u(2.4),
          fontSize: u(1.25),
          lineHeight: 1.7,
        }}
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </pre>
    </SheetFrame>
  );
}
