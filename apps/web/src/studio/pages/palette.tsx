'use client';

import { buildScale, cmykOf, formatOklch, inkOn, rgbOf } from '../../brand/color';
import { COLOR_ROLES, type BrandView, type ColorRole } from '../workspace/brand-view';
import { SECTION_WORDS } from './section-words';
import { PAPER, SheetFrame, occurrenceOf, u, type SheetContext } from './sheet';
import { hairline } from './common';
import { BeyondPage } from './beyond';
import { paletteView, type PaletteView } from './variant';
import { sectionOf } from './section';

// A field's width is its measured share of the logo (BBC p14: the size of each block is its presence),
// with a floor so a colour absent from the logo still shows. Unmeasured colours share the width equally.
const FLOOR = 0.06;
/** Narrowest colour field, in sheet units: room for « Neutre sombre » and a CMYK line. */
const FIELD_MIN = 13;

function presence(
  view: BrandView,
  role: ColorRole,
): { readonly flex: number; readonly note: string } {
  const words = SECTION_WORDS[view.language].palette;
  const share = view.shares?.[role];
  if (share !== undefined)
    return { flex: Math.max(share, FLOOR), note: words.share(Math.round(share * 100)) };
  if (view.sources[role] === 'derived') return { flex: FLOOR, note: words.derived };
  return { flex: 0.25, note: words.unmeasured };
}

const CAPTION = { fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 } as const;

function Scale({ hex, height }: { readonly hex: string; readonly height: number }) {
  return (
    <div className="flex overflow-hidden" style={{ borderRadius: 0 }}>
      {buildScale(hex).map((step) => (
        <span
          key={step.step}
          title={`${String(step.step)} ${step.hex}`}
          className="flex-1"
          style={{ background: step.hex, height: u(height) }}
        />
      ))}
    </div>
  );
}

function ColourField({
  context,
  role,
  ink,
  scale,
}: {
  readonly context: SheetContext;
  readonly role: ColorRole;
  readonly ink: string;
  /** Show the tint scale of the colour under its field (pages devoted to one colour group). */
  readonly scale: boolean;
}) {
  const { view, words } = context;
  const hex = view.colors[role];
  const [c, m, y, k] = cmykOf(hex);
  const { flex, note } = presence(view, role);
  return (
    // A floor width keeps the name and the values legible; the real share is printed in figures.
    <div
      className="flex min-h-0 flex-col"
      style={{ flex: scale ? 1 : flex, minWidth: u(FIELD_MIN), gap: u(0.8) }}
    >
      <div
        className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden border"
        style={{
          background: hex,
          color: inkOn(hex),
          borderRadius: 0,
          padding: u(1.4),
          ...hairline(ink),
        }}
      >
        <div>
          <p
            className="m-0"
            style={{ fontFamily: view.pairing.display.css, fontSize: u(1.8), fontWeight: 600 }}
          >
            {words.roles[role]}
          </p>
          <p className="m-0" style={{ fontSize: u(0.95), opacity: 0.8, marginTop: u(0.4) }}>
            {words.usage[role]}
          </p>
          <p
            className="tabular m-0"
            style={{ fontSize: u(0.85), opacity: 0.75, marginTop: u(0.4) }}
          >
            {note}
          </p>
        </div>
        <dl
          className="tabular m-0 grid grid-cols-[auto_1fr]"
          style={{ fontSize: u(0.8), columnGap: u(0.6), rowGap: u(0.2), lineHeight: 1.35 }}
        >
          <dt style={{ opacity: 0.82 }}>HEX</dt>
          <dd className="m-0">{hex}</dd>
          <dt style={{ opacity: 0.82 }}>RVB</dt>
          <dd className="m-0">{rgbOf(hex).join(' ')}</dd>
          <dt style={{ opacity: 0.82 }}>OKLCH</dt>
          <dd className="m-0 truncate">{formatOklch(hex)}</dd>
          <dt style={{ opacity: 0.82 }}>CMJN</dt>
          <dd className="m-0">{[c, m, y, k].join(' ')}</dd>
        </dl>
      </div>
      {scale ? (
        <div>
          <p className="m-0 uppercase" style={{ ...CAPTION, marginBottom: u(0.6) }}>
            {words.palette.scaleOf(words.roles[role])}
          </p>
          <Scale hex={hex} height={4} />
        </div>
      ) : null}
    </div>
  );
}

// One tint scale of one colour, two halves of five steps over two pages: each step is a tall flat band.
function Detail({
  context,
  role,
  half,
}: {
  readonly context: SheetContext;
  readonly role: ColorRole;
  readonly half: 0 | 1;
}) {
  const { view, words } = context;
  const steps = buildScale(view.colors[role]);
  const middle = Math.ceil(steps.length / 2);
  const shown = half === 0 ? steps.slice(0, middle) : steps.slice(middle);
  return (
    <SheetFrame
      context={context}
      lead={words.lead.palette}
      aside={
        <div>
          <p className="m-0 uppercase" style={CAPTION}>
            {words.palette.scaleOf(words.roles[role])}
          </p>
          <p className="m-0" style={{ fontSize: u(0.85), opacity: 0.6, marginTop: u(0.8) }}>
            {words.palette.cmykNote}
          </p>
        </div>
      }
    >
      <div className="flex h-full" style={{ gap: u(1) }}>
        {shown.map((step) => {
          const [c, m, y, k] = cmykOf(step.hex);
          return (
            <div
              key={step.step}
              className="tabular flex min-w-0 flex-1 flex-col justify-between"
              style={{ background: step.hex, color: inkOn(step.hex), padding: u(1.2) }}
            >
              <p
                className="m-0"
                style={{ fontFamily: view.pairing.display.css, fontSize: u(2.4), fontWeight: 600 }}
              >
                {step.step}
              </p>
              <dl
                className="m-0 grid grid-cols-[auto_1fr]"
                style={{ fontSize: u(0.8), columnGap: u(0.6), rowGap: u(0.2), lineHeight: 1.35 }}
              >
                <dt style={{ opacity: 0.82 }}>HEX</dt>
                <dd className="m-0">{step.hex}</dd>
                <dt style={{ opacity: 0.82 }}>RVB</dt>
                <dd className="m-0">{rgbOf(step.hex).join(' ')}</dd>
                <dt style={{ opacity: 0.82 }}>CMJN</dt>
                <dd className="m-0">{[c, m, y, k].join(' ')}</dd>
              </dl>
            </div>
          );
        })}
      </div>
    </SheetFrame>
  );
}

// A charter with one palette page shows the four roles in their proportions. With several, each page is
// about one colour group (primary, accent, neutrals) and adds the tint scale of every colour it shows.
export function Palette({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  // The dense palette page shows every role in its proportion, whatever the other palette pages are.
  const shown: PaletteView =
    sectionOf(context, 'palette') === 'palette'
      ? { kind: 'overview' }
      : paletteView(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  if (shown.kind === 'detail')
    return <Detail context={context} role={shown.role} half={shown.half} />;
  const roles = shown.kind === 'roles' ? shown.roles : COLOR_ROLES;
  const focused = shown.kind === 'roles';
  return (
    <SheetFrame
      context={context}
      lead={words.lead.palette}
      aside={
        <div>
          {focused ? null : (
            <>
              <p className="m-0 uppercase" style={CAPTION}>
                {words.palette.scale}
              </p>
              <div style={{ marginTop: u(0.8) }}>
                <Scale hex={view.colors.primary} height={3} />
              </div>
            </>
          )}
          <p className="m-0" style={{ fontSize: u(0.85), opacity: 0.6, marginTop: u(0.8) }}>
            {words.palette.cmykNote} {SECTION_WORDS[view.language].palette.pantone}
          </p>
        </div>
      }
    >
      <div className="flex h-full" style={{ gap: u(1) }}>
        {roles.map((role) => (
          <ColourField key={role} context={context} role={role} ink={ink} scale={focused} />
        ))}
      </div>
    </SheetFrame>
  );
}
