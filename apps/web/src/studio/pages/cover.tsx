'use client';

import { contrastRatio, inkOn } from '../../brand/color';
import { LogoImage, logoOn, occurrenceOf, u, type SheetContext } from './sheet';
import { FullPage, M, T, caps } from './art/chrome';
import { MotifGrid, markOn } from './art/mark';
import { moodOf, variantFor } from './art/mood';

type CoverKind = 'giant' | 'split' | 'mosaic';
const COVERS: readonly CoverKind[] = ['giant', 'split', 'mosaic'];

// Three covers, chosen by the brand's tone: a primary field with the mark set large and a cropped echo
// (warm), a 7/5 cut between the field and the paper with the colour mark (strict), a mosaic of the mark
// itself (editorial). A one-colour version still to check never stands in for the logo on a field: the
// field turns to the light neutral and carries the upload itself, directly.
export function Cover({ context }: { readonly context: SheetContext }) {
  const { view } = context;
  const reviewing = view.needsReview.length > 0 && context.background === undefined;
  const kind = variantFor(COVERS, moodOf(view.tone.axes), occurrenceOf(context));
  const field = context.background ?? (reviewing ? view.colors.neutralLight : view.colors.primary);
  const ink = inkOn(field);
  const accent = contrastRatio(view.colors.accent, field) >= 3 ? view.colors.accent : ink;
  const logo = reviewing ? view.logo.color : logoOn(view, field, true);
  const heading = (
    <div style={{ color: ink }}>
      <p className="m-0" style={{ ...caps(), color: accent }}>
        {context.words.edition(context.year)}
      </p>
      <h1
        className="m-0 text-balance"
        style={{
          fontFamily: view.pairing.display.css,
          fontSize: u(kind === 'giant' ? T.title : 6.4),
          lineHeight: 0.96,
          letterSpacing: '-0.03em',
          fontWeight: 700,
          marginTop: u(1.4),
          maxWidth: kind === 'giant' ? u(40) : u(30),
        }}
      >
        {context.words.guideline}
      </h1>
    </div>
  );

  if (kind === 'split') {
    const paper = view.colors.neutralLight;
    const split = reviewing ? view.colors.neutralDark : field;
    return (
      <FullPage context={context} field={paper} chrome={false}>
        <div className="absolute inset-y-0 left-0" style={{ width: '58.3%', background: split }} />
        <div
          className="absolute inset-y-0"
          style={{ left: '58.3%', width: u(1.6), background: view.colors.accent }}
        />
        <div
          className="absolute"
          style={{ left: u(M.side + 1), top: u(15), color: inkOn(split), width: u(44) }}
        >
          <p className="m-0" style={{ ...caps(), opacity: 0.8 }}>
            {context.words.edition(context.year)}
          </p>
          <h1
            className="m-0"
            style={{
              fontFamily: view.pairing.display.css,
              fontSize: u(7.4),
              lineHeight: 0.94,
              letterSpacing: '-0.035em',
              fontWeight: 700,
              marginTop: u(1.6),
            }}
          >
            {context.words.guideline}
          </h1>
        </div>
        <p
          className="absolute m-0"
          style={{
            ...caps(T.sub * 0.55),
            left: u(M.side + 1),
            bottom: u(M.foot + 1),
            color: inkOn(split),
          }}
        >
          {view.name}
        </p>
        <div
          className="absolute grid place-items-center"
          style={{ left: '60.5%', right: u(M.side), top: u(9), bottom: u(9) }}
        >
          <LogoImage src={view.logo.color} alt={view.name} className="max-h-full max-w-full" />
        </div>
      </FullPage>
    );
  }

  if (kind === 'mosaic') {
    return (
      <FullPage context={context} field={field} chrome={false}>
        <div className="absolute inset-y-0 right-0" style={{ width: '58.3%' }}>
          <MotifGrid view={view} kind="repeat" cols={4} rows={5} />
        </div>
        <div
          className="absolute flex flex-col justify-between"
          style={{ left: u(M.side), top: u(M.top), bottom: u(M.foot), width: u(46) }}
        >
          <div
            style={{
              borderTop: `1px solid color-mix(in oklch, ${ink} 38%, transparent)`,
              paddingTop: u(0.9),
              ...caps(),
              color: ink,
            }}
          >
            {view.name}
          </div>
          {heading}
          <LogoImage
            src={logo}
            alt={view.name}
            className="h-auto max-h-[14cqw] w-[26cqw] object-left-bottom"
          />
        </div>
      </FullPage>
    );
  }

  // giant: the mark large at the foot, its tone-on-tone echo cropped by the edge of the page.
  return (
    <FullPage context={context} field={field}>
      <LogoImage
        src={markOn(view, field)}
        className="absolute"
        style={{
          right: u(-22),
          top: u(-14),
          height: u(112),
          width: u(112),
          opacity: 0.1,
          objectPosition: 'left center',
        }}
      />
      <div className="absolute" style={{ left: u(M.side + 1), top: u(14) }}>
        {heading}
      </div>
      <LogoImage
        src={logo}
        alt={view.name}
        className="absolute object-left-bottom"
        style={{ left: u(M.side + 1), bottom: u(M.foot + 3.6), height: u(30), width: u(52) }}
      />
    </FullPage>
  );
}
