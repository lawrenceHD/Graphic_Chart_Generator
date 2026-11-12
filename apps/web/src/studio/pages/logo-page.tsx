'use client';

import { contrastRatio, inkOn } from '../../brand/color';
import {
  LogoImage,
  PAPER,
  SheetFrame,
  logoOn,
  occurrenceOf,
  u,
  useImageAspect,
  useTintedLogo,
  Label,
  type SheetContext,
} from './sheet';
import { FullPage, M, T, caps } from './art/chrome';
import { markOn } from './art/mark';
import { moodOf, variantFor } from './art/mood';
import { BeyondPage } from './beyond';
import { logoView, type LogoView } from './variant';
import { logoBySection, sectionOf } from './section';

interface Version {
  readonly key: string;
  readonly background: string;
  readonly src: string | null;
  readonly label: string;
}

// R5: the official versions: colour, black, white, one brand colour, reversed out of the primary.
function useVersions(context: SheetContext): readonly Version[] {
  const { view, words } = context;
  const review = (kind: 'mono-black' | 'mono-white'): string =>
    view.needsReview.includes(kind) ? ` · ${words.logo.review}` : '';
  const black = view.logo['mono-black'];
  const white = view.logo['mono-white'];
  const tint = useTintedLogo(black, view.colors.primary);
  if (black === null || white === null)
    return [
      {
        key: 'light',
        background: view.colors.neutralLight,
        src: view.logo.color,
        label: words.logo.onLight,
      },
      { key: 'white', background: PAPER, src: view.logo.color, label: words.logo.onColor },
    ];
  return [
    { key: 'reversed', background: view.colors.primary, src: white, label: words.logo.reversed },
    {
      key: 'white',
      background: view.colors.neutralDark,
      src: white,
      label: `${words.logo.white}${review('mono-white')}`,
    },
    {
      key: 'black',
      background: PAPER,
      src: black,
      label: `${words.logo.black}${review('mono-black')}`,
    },
    { key: 'tint', background: view.colors.neutralLight, src: tint, label: words.logo.tint },
  ];
}

/** A flat of colour carrying the mark straight on it, its name at the foot in capitals. */
function Flat({
  background,
  src,
  label,
  logoClass = 'h-[42%] w-[62%]',
}: {
  readonly background: string;
  readonly src: string | null;
  readonly label: string;
  readonly logoClass?: string;
}) {
  const ink = inkOn(background);
  const edge = contrastRatio(background, PAPER) < 1.08;
  return (
    <div
      className="relative grid min-h-0 min-w-0 place-items-center overflow-hidden"
      style={{
        background,
        color: ink,
        boxShadow: edge
          ? `inset 0 0 0 1px color-mix(in oklch, ${ink} 14%, transparent)`
          : undefined,
      }}
    >
      {src === null ? null : <LogoImage src={src} className={logoClass} />}
      <span
        className="absolute"
        style={{ ...caps(), left: u(1.4), bottom: u(1.3), maxWidth: '88%' }}
      >
        {label}
      </span>
    </div>
  );
}

// Hero: the colour mark large on the light neutral (7 columns), the official versions stacked flush at its
// side (5 columns), edge to edge.
function Hero({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const versions = useVersions(context);
  return (
    <FullPage context={context} field={PAPER} box={{ left: M.side, right: 44 }}>
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: '58.3%', background: view.colors.neutralLight }}
      />
      <div
        className="absolute grid place-items-center"
        style={{ left: u(M.side), right: '44%', top: u(11), bottom: u(8) }}
      >
        <LogoImage src={view.logo.color} alt={view.name} className="size-full" />
      </div>
      <p className="absolute m-0" style={{ ...caps(), left: u(M.side), top: u(8.4) }}>
        {words.logo.primary}
      </p>
      <div
        className="absolute inset-y-0 right-0 grid"
        style={{
          width: '41.7%',
          gridTemplateRows: `repeat(${String(versions.length)}, minmax(0, 1fr))`,
        }}
      >
        {versions.map((version) => (
          <Flat
            key={version.key}
            background={version.background}
            src={version.src}
            label={version.label}
            logoClass="h-[44%] w-[52%]"
          />
        ))}
      </div>
    </FullPage>
  );
}

// Bands: the versions as full-height colourways side by side, as the printed guidelines show them.
function VersionBands({ context }: { readonly context: SheetContext }) {
  const fields = useVersions(context);
  return (
    <FullPage context={context} field={PAPER}>
      <div
        className="absolute inset-x-0 grid"
        style={{
          top: u(9),
          bottom: u(8.5),
          gridTemplateColumns: `repeat(${String(fields.length)}, minmax(0, 1fr))`,
        }}
      >
        {fields.map((version) => (
          <Flat
            key={version.key}
            background={version.background}
            src={version.src}
            label={version.label}
            logoClass="h-[34%] w-[64%]"
          />
        ))}
      </div>
    </FullPage>
  );
}

// Crop: the mark alone, cropped by the edge of the page (the symbol and the favicon), beside its sizes.
function Crop({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const field = view.colors.primary;
  const icon = view.logo.favicon ?? view.logo.color;
  return (
    <FullPage context={context} field={PAPER} box={{ left: M.side, right: 46 }}>
      <div
        className="absolute inset-y-0 right-0 overflow-hidden"
        style={{ width: '41.7%', background: field }}
      >
        <LogoImage
          src={markOn(view, field)}
          className="absolute"
          style={{ left: '-18%', top: '-12%', width: '150%', height: '124%' }}
        />
      </div>
      <div className="absolute" style={{ left: u(M.side), top: u(15), width: u(40) }}>
        <h2
          className="m-0 text-balance"
          style={{
            fontFamily: view.pairing.display.css,
            fontSize: u(T.title),
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
            fontWeight: 700,
          }}
        >
          {words.logo.favicon}
        </h2>
        <p
          className="m-0"
          style={{
            fontSize: u(T.body),
            lineHeight: 1.5,
            opacity: 0.75,
            marginTop: u(1.6),
            maxWidth: '32ch',
          }}
        >
          {words.lead.logo}
        </p>
      </div>
      <div className="absolute flex items-end" style={{ left: u(M.side), bottom: u(8), gap: u(3) }}>
        {[8, 5, 3].map((size) => (
          <div key={size} className="flex flex-col" style={{ gap: u(0.8) }}>
            <LogoImage src={icon} style={{ width: u(size), height: u(size) }} />
            <span className="tabular" style={caps(T.folio)}>
              {String(size * 8)} px
            </span>
          </div>
        ))}
      </div>
    </FullPage>
  );
}

// The drawing's own proportions: its box, its axes and its width to height ratio (no redrawing, R1).
function Construction({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const measured = useImageAspect(view.logo.color);
  const aspect = typeof measured === 'number' ? measured : 2;
  const ink = inkOn(context.background ?? PAPER);
  const guide = `color-mix(in oklch, ${view.colors.accent} 70%, ${ink})`;
  const line = { background: guide, position: 'absolute' } as const;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.logo}
      aside={
        <div>
          <Label>{words.logo.proportions}</Label>
          <p className="tabular m-0" style={{ fontSize: u(2.2), marginTop: u(0.6) }}>
            {aspect.toFixed(2)} : 1
          </p>
        </div>
      }
    >
      <div className="relative grid h-full place-items-center" style={{ containerType: 'size' }}>
        <div
          className="relative"
          style={{ aspectRatio: String(aspect), width: `min(88cqw, ${String(74 * aspect)}cqh)` }}
        >
          <div className="absolute inset-0 border border-dashed" style={{ borderColor: guide }} />
          <span style={{ ...line, left: '50%', top: 0, bottom: 0, width: 1 }} />
          <span style={{ ...line, top: '50%', left: 0, right: 0, height: 1 }} />
          <LogoImage src={view.logo.color} alt={view.name} className="absolute inset-0 size-full" />
        </div>
      </div>
    </SheetFrame>
  );
}

// The logo on each brand field, version chosen to read on it, laid directly on the flat colour.
function Usages({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const { neutralLight, neutralDark, primary, accent } = view.colors;
  const fields = [
    { key: 'light', background: neutralLight, label: words.logo.onLight, neutral: true },
    { key: 'dark', background: neutralDark, label: words.logo.onDark, neutral: false },
    { key: 'primary', background: primary, label: words.logo.reversed, neutral: false },
    { key: 'accent', background: accent, label: words.logo.onAccent, neutral: false },
  ];
  return (
    <FullPage context={context} field={PAPER}>
      <div
        className="absolute inset-x-0 grid grid-cols-2 grid-rows-2"
        style={{ top: u(9), bottom: u(8.5) }}
      >
        {fields.map((field) => (
          <Flat
            key={field.key}
            background={field.background}
            src={logoOn(view, field.background, field.neutral)}
            label={field.label}
            logoClass="h-[44%] w-[40%]"
          />
        ))}
      </div>
    </FullPage>
  );
}

const OVERVIEWS = ['hero', 'bands', 'crop'] as const;

export function LogoPage({ context }: { readonly context: SheetContext }) {
  const occurrence = occurrenceOf(context);
  const bySection = logoBySection(sectionOf(context, 'logo'));
  const shown: LogoView = bySection === null ? logoView(occurrence) : { kind: bySection };
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  if (shown.kind === 'construction') return <Construction context={context} />;
  if (shown.kind === 'usages') return <Usages context={context} />;
  if (shown.kind === 'variants') return <VersionBands context={context} />;
  const lead =
    occurrence.count > 1
      ? 'hero'
      : variantFor(OVERVIEWS, moodOf(context.view.tone.axes), occurrence);
  if (lead === 'bands') return <VersionBands context={context} />;
  return lead === 'crop' ? <Crop context={context} /> : <Hero context={context} />;
}
