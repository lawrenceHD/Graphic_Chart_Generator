'use client';

import { contrastRatio, inkOn } from '../../brand/color';
import { Measure, PAPER, SheetFrame, occurrenceOf, u, type SheetContext } from './sheet';
import { hairline } from './common';
import { BeyondPage } from './beyond';
import { typeView, type GlyphSet } from './variant';

interface Row {
  readonly label: string;
  readonly size: number;
  readonly weight: number;
  readonly font: string;
  /** Set the brand name (headings) rather than the sample sentence. */
  readonly name: boolean;
}

function TypeSheet({
  context,
  focus,
}: {
  readonly context: SheetContext;
  readonly focus: 'both' | 'headings' | 'text';
}) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const display = view.pairing.display;
  const text = view.pairing.text;
  const sizes: readonly Row[] =
    focus === 'headings'
      ? [
          { label: words.type.h1, size: 7, weight: 700, font: display.css, name: true },
          { label: words.type.h2, size: 4.4, weight: 600, font: display.css, name: true },
          { label: words.type.h3, size: 2.6, weight: 600, font: display.css, name: true },
          { label: words.type.lead, size: 1.7, weight: 500, font: display.css, name: false },
        ]
      : focus === 'text'
        ? [
            { label: words.type.lead, size: 1.9, weight: 500, font: text.css, name: false },
            { label: words.type.body, size: 1.35, weight: 400, font: text.css, name: false },
            { label: words.type.caption, size: 1, weight: 500, font: text.css, name: false },
          ]
        : [
            { label: words.type.h1, size: 4.6, weight: 700, font: display.css, name: true },
            { label: words.type.h2, size: 2.8, weight: 600, font: display.css, name: true },
            { label: words.type.body, size: 1.35, weight: 400, font: text.css, name: false },
            { label: words.type.caption, size: 1, weight: 500, font: text.css, name: false },
          ];
  const families = [
    { family: display, role: words.type.display, shown: focus !== 'text' },
    {
      family: text,
      role: `${words.type.text} · ${words.type.licence}`,
      shown: focus !== 'headings',
    },
  ].filter((entry) => entry.shown);
  const specimen = focus === 'text' ? text : display;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.typography}
      aside={
        <div className="flex flex-col" style={{ gap: u(1.4) }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: specimen.css,
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
          {families.map(({ family, role }) => (
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
              className={size.name ? 'm-0 truncate' : 'm-0 text-pretty'}
              style={{
                maxWidth: size.name ? undefined : '62ch',
                fontFamily: size.font,
                fontSize: u(size.size),
                fontWeight: size.weight,
                lineHeight: 1.1,
                letterSpacing: size.name ? '-0.02em' : '0',
              }}
            >
              {size.name ? view.name : words.type.sample}
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
            fontFamily: specimen.css,
          }}
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 àâçéèêëîïôûù
        </p>
      </div>
    </SheetFrame>
  );
}

const GLYPHS: Readonly<Record<GlyphSet, { readonly text: string; readonly size: number }>> = {
  upper: { text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', size: 7.2 },
  lower: { text: 'abcdefghijklmnopqrstuvwxyz', size: 7.2 },
  figures: { text: '0123456789 + − × ÷ = % € $ . , ; : ! ? « » ( ) & @ #', size: 6 },
  accents: { text: 'À Â Æ Ç É È Ê Ë Î Ï Ô Œ Ù Û Ü Ÿ à â æ ç é è ê ë î ï ô œ ù û ü ÿ', size: 5.6 },
};

// The alphabet of one family, one set per page: capitals, lower case, figures and signs, accents.
function Glyphs({
  context,
  family,
  set,
}: {
  readonly context: SheetContext;
  readonly family: 'display' | 'text';
  readonly set: GlyphSet;
}) {
  const { view, words } = context;
  const face = view.pairing[family];
  const ink = inkOn(context.background ?? PAPER);
  const glyphs = GLYPHS[set];
  return (
    <SheetFrame
      context={context}
      lead={words.lead.typography}
      aside={
        <div className="border-t" style={{ ...hairline(ink), paddingTop: u(0.8) }}>
          <p
            className="m-0"
            style={{ fontFamily: face.css, fontSize: u(1.6), fontWeight: 600, lineHeight: 1.15 }}
          >
            {face.name}
          </p>
          <Measure style={{ opacity: 0.62 }}>
            {family === 'display' ? words.type.display : words.type.text} · {words.type.glyphs[set]}
          </Measure>
        </div>
      }
    >
      <p
        className="m-0 flex h-full items-center text-balance break-words"
        style={{
          fontFamily: face.css,
          fontSize: u(glyphs.size),
          lineHeight: 1.12,
          fontWeight: family === 'display' ? 600 : 400,
        }}
      >
        {glyphs.text}
      </p>
    </SheetFrame>
  );
}

export function Typography({ context }: { readonly context: SheetContext }) {
  const shown = typeView(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  if (shown.kind === 'glyphs')
    return <Glyphs context={context} family={shown.family} set={shown.set} />;
  return <TypeSheet context={context} focus={shown.kind} />;
}
