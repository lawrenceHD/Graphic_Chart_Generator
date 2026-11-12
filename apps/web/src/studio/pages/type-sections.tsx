'use client';

import { inkOn } from '../../brand/color';
import { hairline } from './common';
import { Label, Measure, PAPER, SheetFrame, u, type SheetContext } from './sheet';
import { fallbackOf, typeScale } from './section';
import { SECTION_WORDS } from './section-words';

// One point of print in sheet units: the sheet is 297 mm wide and 100 u, a point is 25.4 / 72 mm. The
// hierarchy is set at its printed size, so the page is its own specimen.
const PT = 25.4 / 72 / 2.97;

const numberIn = (language: 'fr' | 'en') =>
  new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 });

// The two families of the charter (POR, ETA p42-44): role, source and licence, weights in use, and the
// fallback for office suites and the web (BBC p19, SLK p33, NEV).
export function Families({ context }: { readonly context: SheetContext }) {
  const { view } = context;
  const words = SECTION_WORDS[view.language].families;
  const ink = inkOn(context.background ?? PAPER);
  const faces = (['display', 'text'] as const).map((role) => ({ role, face: view.pairing[role] }));
  return (
    <SheetFrame context={context} lead={words.lead} wide>
      <div className="grid h-full grid-cols-2" style={{ gap: u(3) }}>
        {faces.map(({ role, face }) => {
          const fallback = fallbackOf(face.css);
          return (
            <section key={role} className="flex min-h-0 min-w-0 flex-col" style={{ gap: u(1) }}>
              <Label style={{ opacity: 0.6 }}>{words.role[role]}</Label>
              <p
                className="m-0"
                aria-hidden="true"
                style={{ fontFamily: face.css, fontSize: u(8.5), lineHeight: 0.9, fontWeight: 600 }}
              >
                Aa
              </p>
              <p
                className="m-0"
                style={{ fontFamily: face.css, fontSize: u(2.2), fontWeight: 600 }}
              >
                {face.name}
              </p>
              <p
                className="m-0 break-words"
                style={{ fontFamily: face.css, fontSize: u(1.15), lineHeight: 1.4, opacity: 0.8 }}
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 àâçéèêëîïôûù
              </p>
              <Measure style={{ opacity: 0.7 }}>{words.weights[role]}</Measure>
              <Measure style={{ opacity: 0.7 }}>{words.source}</Measure>
              <div
                className="mt-auto border-t"
                style={{ ...hairline(ink), paddingTop: u(0.9), display: 'grid', gap: u(0.4) }}
              >
                <Label>{words.fallback}</Label>
                <p className="m-0" style={{ fontSize: u(1.05) }}>
                  <span style={{ opacity: 0.6 }}>{words.office} · </span>
                  <span style={{ fontFamily: fallback.web }}>{fallback.office}</span>
                </p>
                <p className="m-0" style={{ fontSize: u(1.05) }}>
                  <span style={{ opacity: 0.6 }}>{words.web} · </span>
                  {`'${face.name}', ${fallback.web}`}
                </p>
                <p className="m-0" style={{ fontSize: u(0.95), opacity: 0.7 }}>
                  {words.google(face.name)}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </SheetFrame>
  );
}

// The hierarchy in figures (SLK p33, BBC p18, POR): size in pt and px, leading, tracking, set at print
// size, then the rules of setting and what is never done with the type (BBC p21).
export function Hierarchy({ context }: { readonly context: SheetContext }) {
  const { view } = context;
  const words = SECTION_WORDS[view.language].hierarchy;
  const ink = inkOn(context.background ?? PAPER);
  const numbers = numberIn(view.language);
  const format = (value: number): string => numbers.format(value);
  return (
    <SheetFrame
      context={context}
      lead={words.lead}
      aside={
        <div className="flex flex-col" style={{ gap: u(0.8) }}>
          <p className="m-0" style={{ fontSize: u(0.95), lineHeight: 1.45, opacity: 0.8 }}>
            {words.scale} {words.rules}
          </p>
          <ul className="m-0 list-none p-0" style={{ display: 'grid', gap: u(0.35) }}>
            {words.donts.map((dont) => (
              <li
                key={dont}
                className="border-t"
                style={{
                  ...hairline(ink),
                  fontSize: u(0.9),
                  lineHeight: 1.35,
                  paddingTop: u(0.35),
                }}
              >
                {dont}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <table className="h-full w-full border-collapse" style={{ fontSize: u(0.9) }}>
        <thead>
          <tr className="text-left" style={{ opacity: 0.6 }}>
            {[
              words.columns.level,
              '',
              words.columns.size,
              words.columns.leading,
              words.columns.tracking,
            ].map((heading, index) => (
              <th
                key={`${heading}-${String(index)}`}
                className="font-semibold"
                style={{ paddingBottom: u(0.6) }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {typeScale().map((row) => (
            <tr key={row.level} className="border-t align-baseline" style={hairline(ink)}>
              <td
                className="whitespace-nowrap"
                style={{ padding: `${u(0.7)} ${u(1.2)} ${u(0.7)} 0`, opacity: 0.7 }}
              >
                {words.levels[row.level]}
              </td>
              <td style={{ width: '58%', padding: `${u(0.7)} ${u(1.2)} ${u(0.7)} 0` }}>
                <span
                  className="block truncate"
                  style={{
                    fontFamily: view.pairing[row.family].css,
                    fontSize: u(row.pt * PT),
                    lineHeight: row.leadingPt / row.pt,
                    letterSpacing: `${String(row.tracking / 1000)}em`,
                    fontWeight: row.weight,
                  }}
                >
                  {row.family === 'display' ? view.name : words.sample}
                </span>
              </td>
              <td className="tabular whitespace-nowrap">
                {format(row.pt)} pt · {String(row.px)} px
              </td>
              <td className="tabular whitespace-nowrap">{format(row.leadingPt)} pt</td>
              <td className="tabular whitespace-nowrap">
                {row.tracking === 0
                  ? '0'
                  : `${row.tracking < 0 ? '−' : '+'}${String(Math.abs(row.tracking))}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SheetFrame>
  );
}
