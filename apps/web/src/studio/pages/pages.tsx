'use client';

import type { PageType } from '@app/contracts';
import { Check, Minus, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import {
  buildScale,
  cmykOf,
  contrastRatio,
  contrastVerdict,
  formatOklch,
  inkOn,
  isDark,
  rgbOf,
} from '../../brand/color';
import { COLOR_ROLES, briefLead, type ColorRole } from '../workspace/brand-view';
import {
  LogoImage,
  Measure,
  PAPER,
  SheetFrame,
  logoOn,
  u,
  useImageAspect,
  useTintedLogo,
  type SheetContext,
} from './sheet';

// The ten page types of the initial document (01 §4), drawn only from the document: nothing here is
// invented. Pages whose text the AI has not written yet say so, and quote the brief instead.
type Renderer = (props: { readonly context: SheetContext }) => ReactNode;

const hairline = (ink: string): CSSProperties => ({
  borderColor: `color-mix(in oklch, ${ink} 14%, transparent)`,
});

function Cover({ context }: { readonly context: SheetContext }) {
  const { view, words, portrait } = context;
  const field = context.background ?? view.colors.primary;
  const ink = inkOn(field);
  const lead = briefLead(view.brief, 140);
  // The cover is the first thing anyone sees: a one-colour version still to check (traced from a raster
  // upload) never stands in for the logo there; the upload sits on its light plate instead.
  const logo = view.needsReview.length > 0 ? view.logo.color : logoOn(view, field);
  const plate = logo === view.logo.color && field !== view.colors.neutralLight;
  return (
    <SheetFrame context={{ ...context, background: field }} bleed>
      <div
        className="absolute inset-0 flex flex-col"
        style={{ padding: u(4.4), color: ink, fontFamily: view.pairing.text.css }}
      >
        <div
          className="flex items-baseline justify-between font-mono uppercase"
          style={{ fontSize: u(0.95), letterSpacing: '0.16em', opacity: 0.75 }}
        >
          <span>{words.guideline}</span>
          <span className="tabular">{words.edition(context.year)}</span>
        </div>
        <div
          className={`grid min-h-0 flex-1 items-center ${portrait ? 'grid-rows-[1fr_auto]' : 'grid-cols-12'}`}
          style={{ gap: u(3) }}
        >
          <div
            className={`flex min-w-0 flex-col justify-end self-end ${portrait ? 'order-2' : 'col-span-6'}`}
          >
            <p
              className="m-0 text-balance"
              style={{
                fontFamily: view.pairing.display.css,
                fontSize: u(portrait ? 10 : 8.4),
                lineHeight: 0.9,
                letterSpacing: '-0.035em',
                fontWeight: 700,
              }}
            >
              {view.name}
            </p>
            {lead === null ? null : (
              <p
                className="m-0 text-pretty"
                style={{
                  fontSize: u(1.4),
                  lineHeight: 1.45,
                  opacity: 0.8,
                  marginTop: u(1.8),
                  maxWidth: '38ch',
                }}
              >
                {lead}
              </p>
            )}
          </div>
          <div
            className={`grid h-full min-h-0 place-items-center ${portrait ? 'order-1' : 'col-span-6'}`}
          >
            {plate ? (
              // No one-colour version reads on this field: the colour logo sits on its light plate,
              // never on its own colours.
              <div
                className="grid size-full place-items-center"
                style={{ background: view.colors.neutralLight, borderRadius: u(1.4) }}
              >
                <LogoImage src={view.logo.color} alt={view.name} className="h-[58%] w-[78%]" />
              </div>
            ) : (
              <LogoImage src={logo} alt={view.name} className="h-[62%] w-[82%]" />
            )}
          </div>
        </div>
        <div
          className="flex overflow-hidden"
          style={{ height: u(1), borderRadius: u(0.5), marginTop: u(2.4) }}
        >
          {COLOR_ROLES.map((role, index) => (
            <span
              key={role}
              style={{
                background: view.colors[role],
                flex: [5, 2, 2, 1][index],
                boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${ink} 18%, transparent)`,
              }}
            />
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function Manifesto({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  if (!view.written) {
    const quote = briefLead(view.brief, 320);
    return (
      <SheetFrame context={context} lead={words.lead.manifesto}>
        <div className="flex h-full flex-col justify-center" style={{ gap: u(2.4) }}>
          <p
            className="m-0 font-mono uppercase"
            style={{ fontSize: u(0.95), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {quote === null ? words.manifesto.pending : words.manifesto.fromBrief}
          </p>
          <p
            className="m-0 text-balance"
            style={{
              fontFamily: view.pairing.display.css,
              fontSize: u(quote === null ? 3.4 : 2.7),
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
            }}
          >
            {quote === null ? words.manifesto.pending : `« ${quote} »`}
          </p>
          <p
            className="m-0 border-t"
            style={{
              ...hairline(ink),
              fontSize: u(1.15),
              opacity: 0.66,
              paddingTop: u(1.6),
              maxWidth: '52ch',
            }}
          >
            {words.manifesto.pendingNote}
          </p>
        </div>
      </SheetFrame>
    );
  }
  return (
    <SheetFrame context={context} lead={words.lead.manifesto}>
      <div className="flex h-full flex-col" style={{ gap: u(2.4) }}>
        <Statement label={words.manifesto.mission} text={view.mission} context={context} large />
        <Statement label={words.manifesto.vision} text={view.vision} context={context} />
        <div className="mt-auto grid grid-cols-4" style={{ gap: u(1.6) }}>
          {view.values.map((value) => (
            <div
              key={value.label}
              className="border-t"
              style={{ ...hairline(ink), paddingTop: u(1.2) }}
            >
              <p
                className="m-0"
                style={{ fontFamily: view.pairing.display.css, fontSize: u(1.7), fontWeight: 600 }}
              >
                {value.label}
              </p>
              <p className="m-0" style={{ fontSize: u(1.05), opacity: 0.7, marginTop: u(0.6) }}>
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function Statement({
  label,
  text,
  context,
  large = false,
}: {
  readonly label: string;
  readonly text: string;
  readonly context: SheetContext;
  readonly large?: boolean;
}) {
  if (text.trim() === '') return null;
  return (
    <div>
      <p
        className="m-0 font-mono uppercase"
        style={{ fontSize: u(0.95), letterSpacing: '0.14em', opacity: 0.6 }}
      >
        {label}
      </p>
      <p
        className="m-0 text-balance"
        style={{
          fontFamily: context.view.pairing.display.css,
          fontSize: u(large ? 2.9 : 1.9),
          lineHeight: 1.12,
          marginTop: u(0.8),
        }}
      >
        {text}
      </p>
    </div>
  );
}

function Tile({
  background,
  children,
  label,
  ink,
  style,
  className = '',
}: {
  readonly background: string;
  readonly children: ReactNode;
  readonly label?: string;
  readonly ink: string;
  readonly style?: CSSProperties;
  readonly className?: string;
}) {
  return (
    <figure className={`m-0 flex min-h-0 flex-col ${className}`} style={{ gap: u(0.7), ...style }}>
      <div
        className="relative grid min-h-0 flex-1 place-items-center overflow-hidden border"
        style={{ background, borderRadius: u(0.9), ...hairline(ink) }}
      >
        {children}
      </div>
      {label === undefined ? null : (
        <figcaption className="font-mono" style={{ fontSize: u(0.9), opacity: 0.7 }}>
          {label}
        </figcaption>
      )}
    </figure>
  );
}

function LogoPage({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const review = (kind: 'mono-black' | 'mono-white'): string =>
    view.needsReview.includes(kind) ? ` · ${words.logo.review}` : '';
  const black = view.logo['mono-black'];
  const white = view.logo['mono-white'];
  // R5: the official versions — colour, black, white, one brand colour, reversed out of the primary.
  const tint = useTintedLogo(black, view.colors.primary);
  const versions: readonly {
    readonly key: string;
    readonly background: string;
    readonly src: string | null;
    readonly label: string;
  }[] = [
    {
      key: 'black',
      background: '#FFFFFF',
      src: black,
      label: `${words.logo.black}${review('mono-black')}`,
    },
    {
      key: 'white',
      background: view.colors.neutralDark,
      src: white,
      label: `${words.logo.white}${review('mono-white')}`,
    },
    { key: 'tint', background: view.colors.neutralLight, src: tint, label: words.logo.tint },
    { key: 'reversed', background: view.colors.primary, src: white, label: words.logo.reversed },
  ];
  const monochrome = black !== null && white !== null;
  return (
    <SheetFrame context={context} lead={words.lead.logo}>
      <div
        className={`grid h-full ${monochrome ? 'grid-cols-4' : 'grid-cols-6'} grid-rows-[1.5fr_1fr]`}
        style={{ gap: u(1.4) }}
      >
        <Tile
          background={view.colors.neutralLight}
          ink={ink}
          label={words.logo.primary}
          className={monochrome ? 'col-span-4' : 'col-span-6'}
        >
          <LogoImage src={view.logo.color} alt={view.name} className="h-[66%] w-[60%]" />
        </Tile>
        {monochrome ? (
          versions.map((version) => (
            <Tile key={version.key} background={version.background} ink={ink} label={version.label}>
              {version.src === null ? null : (
                <LogoImage src={version.src} className="h-[56%] w-[76%]" />
              )}
            </Tile>
          ))
        ) : (
          <>
            <Tile
              background={view.colors.primary}
              ink={ink}
              label={words.logo.onColor}
              className="col-span-2"
            >
              <LogoImage src={logoOn(view, view.colors.primary)} className="h-[56%] w-[70%]" />
            </Tile>
            <Tile background="#FFFFFF" ink={ink} label={words.logo.onLight} className="col-span-2">
              <LogoImage src={view.logo.color} className="h-[56%] w-[70%]" />
            </Tile>
            <Tile
              background={view.colors.neutralDark}
              ink={ink}
              label={words.logo.onDark}
              className="col-span-2"
            >
              <LogoImage src={view.logo.color} className="h-[56%] w-[70%]" />
            </Tile>
          </>
        )}
      </div>
    </SheetFrame>
  );
}

function ClearSpace({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const measured = useImageAspect(view.logo.color);
  const aspect = typeof measured === 'number' ? measured : 2;
  const ink = inkOn(context.background ?? PAPER);
  const ratio = view.rules.clearSpaceRatio;
  // Logo box in percent of the drawing: height 1, width = aspect, margin = ratio on every side.
  const totalWidth = aspect + 2 * ratio;
  const totalHeight = 1 + 2 * ratio;
  const guide = `color-mix(in oklch, ${view.colors.accent} 70%, ${ink})`;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.clearSpace}
      aside={
        <div className="flex flex-col" style={{ gap: u(1.4) }}>
          <p className="m-0" style={{ fontSize: u(1.1), opacity: 0.72 }}>
            {words.clearSpace.zone(Math.round(ratio * 100))}
          </p>
          <div className="border-t" style={{ ...hairline(ink), paddingTop: u(1.2) }}>
            <p
              className="m-0 font-mono uppercase"
              style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
            >
              {words.clearSpace.minimum}
            </p>
            <div className="flex items-end" style={{ gap: u(2.4), marginTop: u(1) }}>
              <MinSize
                label={words.clearSpace.screen}
                value={`${String(view.rules.minSizePx)} px`}
                src={view.logo.color}
                height={2.4}
              />
              <MinSize
                label={words.clearSpace.print}
                value={`${String(view.rules.minSizeMm)} mm`}
                src={view.logo.color}
                height={1.6}
              />
            </div>
          </div>
        </div>
      }
    >
      <div
        className="relative grid h-full place-items-center border"
        style={{ background: view.colors.neutralLight, borderRadius: u(1), ...hairline(ink) }}
      >
        <div
          className="relative"
          style={{
            aspectRatio: `${String(totalWidth)} / ${String(totalHeight)}`,
            height: '74%',
            maxWidth: '88%',
          }}
        >
          <div
            className="absolute inset-0 border border-dashed"
            style={{
              borderColor: guide,
              background: `color-mix(in oklch, ${view.colors.accent} 9%, transparent)`,
            }}
          />
          <div
            className="absolute"
            style={{
              left: `${String((ratio / totalWidth) * 100)}%`,
              right: `${String((ratio / totalWidth) * 100)}%`,
              top: `${String((ratio / totalHeight) * 100)}%`,
              bottom: `${String((ratio / totalHeight) * 100)}%`,
              outline: `1px solid ${guide}`,
            }}
          >
            <LogoImage src={view.logo.color} alt={view.name} className="size-full" />
          </div>
          {(['top', 'left'] as const).map((side) => (
            <span
              key={side}
              className="absolute grid place-items-center font-mono"
              style={{
                fontSize: u(1.1),
                color: guide,
                ...(side === 'top'
                  ? {
                      top: 0,
                      height: `${String((ratio / totalHeight) * 100)}%`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }
                  : {
                      left: 0,
                      width: `${String((ratio / totalWidth) * 100)}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }),
              }}
            >
              x
            </span>
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function MinSize({
  label,
  value,
  src,
  height,
}: {
  readonly label: string;
  readonly value: string;
  readonly src: string;
  readonly height: number;
}) {
  return (
    <div className="flex flex-col" style={{ gap: u(0.6) }}>
      <LogoImage src={src} style={{ height: u(height), width: 'auto', maxWidth: u(12) }} />
      <Measure style={{ opacity: 0.75 }}>
        {label} · {value}
      </Measure>
    </div>
  );
}

interface Misuse {
  readonly key: string;
  readonly label: string;
  readonly ok?: boolean;
  readonly background?: string;
  readonly art?: CSSProperties;
  readonly busy?: boolean;
  readonly crowd?: boolean;
}

function DoDont({ context }: { readonly context: SheetContext }) {
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
                borderRadius: u(0.8),
                background: panel.busy
                  ? `repeating-linear-gradient(135deg, ${view.colors.primary} 0 ${u(0.8)}, ${view.colors.accent} ${u(0.8)} ${u(1.6)}, ${light} ${u(1.6)} ${u(2.4)})`
                  : (panel.background ?? light),
                ...hairline(ink),
              }}
            >
              <LogoImage src={view.logo.color} className="h-[46%] w-[66%]" style={panel.art} />
              {panel.crowd ? (
                <span
                  className="absolute font-mono"
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

const SHARE: Readonly<Record<ColorRole, number>> = {
  primary: 34,
  accent: 24,
  neutralLight: 22,
  neutralDark: 20,
};

function Palette({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  return (
    <SheetFrame
      context={context}
      lead={words.lead.palette}
      aside={
        <div>
          <p
            className="m-0 font-mono uppercase"
            style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {words.palette.scale}
          </p>
          <div className="flex overflow-hidden" style={{ marginTop: u(0.8), borderRadius: u(0.6) }}>
            {buildScale(view.colors.primary).map((step) => (
              <span
                key={step.step}
                title={`${String(step.step)} ${step.hex}`}
                className="flex-1"
                style={{ background: step.hex, height: u(3) }}
              />
            ))}
          </div>
          <p className="m-0" style={{ fontSize: u(0.85), opacity: 0.6, marginTop: u(0.8) }}>
            {words.palette.cmykNote}
          </p>
        </div>
      }
    >
      <div className="flex h-full" style={{ gap: u(1) }}>
        {COLOR_ROLES.map((role) => {
          const hex = view.colors[role];
          const on = inkOn(hex);
          const [c, m, y, k] = cmykOf(hex);
          return (
            <div
              key={role}
              className="flex min-w-0 flex-col justify-between overflow-hidden border"
              style={{
                flex: SHARE[role],
                background: hex,
                color: on,
                borderRadius: u(1),
                padding: u(1.4),
                ...hairline(ink),
              }}
            >
              <div>
                <p
                  className="m-0"
                  style={{
                    fontFamily: view.pairing.display.css,
                    fontSize: u(1.8),
                    fontWeight: 600,
                  }}
                >
                  {words.roles[role]}
                </p>
                <p className="m-0" style={{ fontSize: u(0.95), opacity: 0.8, marginTop: u(0.4) }}>
                  {words.usage[role]}
                </p>
              </div>
              <dl
                className="tabular m-0 grid grid-cols-[auto_1fr] font-mono"
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
          );
        })}
      </div>
    </SheetFrame>
  );
}

function VerdictIcon({ tone }: { readonly tone: 'ok' | 'mid' | 'bad' }) {
  const style = { width: u(1), height: u(1) };
  if (tone === 'ok') return <Check aria-hidden="true" style={style} />;
  if (tone === 'mid') return <Minus aria-hidden="true" style={style} />;
  return <X aria-hidden="true" style={style} />;
}

function Contrast({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  // White is added for reference unless a role already is white; equal colours are shown once.
  const swatches = [
    ...COLOR_ROLES.map((role) => ({ hex: view.colors[role], name: words.roles[role] })),
    { hex: '#FFFFFF', name: words.logo.white },
  ].filter((swatch, index, list) => list.findIndex((other) => other.hex === swatch.hex) === index);
  const pairs = swatches
    .flatMap((text) =>
      swatches
        .filter((background) => background.hex !== text.hex)
        .map((background) => ({
          text,
          background,
          ratio: contrastRatio(text.hex, background.hex),
        })),
    )
    .filter((pair) => pair.ratio >= 4.5)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 4);
  return (
    <SheetFrame
      context={context}
      lead={words.lead.contrast}
      aside={
        <div>
          <p
            className="m-0 font-mono uppercase"
            style={{ fontSize: u(0.9), letterSpacing: '0.14em', opacity: 0.6 }}
          >
            {words.contrast.best}
          </p>
          <ul className="m-0 list-none p-0" style={{ marginTop: u(0.8) }}>
            {pairs.map((pair) => (
              <li
                key={`${pair.text.hex}${pair.background.hex}`}
                className="flex items-center justify-between border-t"
                style={{ ...hairline(ink), fontSize: u(1), paddingBlock: u(0.5) }}
              >
                <span className="flex items-center" style={{ gap: u(0.6) }}>
                  <span
                    className="grid place-items-center"
                    style={{
                      background: pair.background.hex,
                      color: pair.text.hex,
                      width: u(2.4),
                      height: u(1.6),
                      borderRadius: u(0.4),
                      fontSize: u(0.9),
                      fontWeight: 600,
                    }}
                  >
                    Aa
                  </span>
                  {words.contrast.textOn(pair.text.name, pair.background.name)}
                </span>
                <Measure>{pair.ratio.toFixed(1)}:1</Measure>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <div className="flex h-full flex-col" style={{ gap: u(0.8) }}>
        <p className="m-0" style={{ fontSize: u(1), opacity: 0.7 }}>
          {words.contrast.legend}
        </p>
        <div
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: `${u(7)} repeat(${String(swatches.length)}, 1fr)`,
            gap: u(0.5),
          }}
        >
          <span />
          {swatches.map((background) => (
            <span
              key={background.hex}
              className="truncate font-mono"
              style={{ fontSize: u(0.85), opacity: 0.7, alignSelf: 'end' }}
            >
              {background.hex}
            </span>
          ))}
          {swatches.map((text) => (
            <ContrastRow key={text.hex} text={text} swatches={swatches} words={words} />
          ))}
        </div>
      </div>
    </SheetFrame>
  );
}

function ContrastRow({
  text,
  swatches,
  words,
}: {
  readonly text: { readonly hex: string; readonly name: string };
  readonly swatches: readonly { readonly hex: string; readonly name: string }[];
  readonly words: SheetContext['words'];
}) {
  return (
    <>
      <span className="flex items-center truncate" style={{ fontSize: u(0.95) }}>
        {text.name}
      </span>
      {swatches.map((background) => {
        if (background.hex === text.hex)
          return (
            <span
              key={background.hex}
              style={{
                borderRadius: u(0.5),
                background: 'color-mix(in oklch, currentColor 5%, transparent)',
              }}
            />
          );
        const ratio = contrastRatio(text.hex, background.hex);
        const verdict = contrastVerdict(ratio);
        return (
          <span
            key={background.hex}
            className="flex flex-col items-center justify-center border"
            style={{
              background: background.hex,
              color: text.hex,
              borderRadius: u(0.5),
              borderColor: 'color-mix(in oklch, currentColor 10%, transparent)',
              opacity: verdict.tone === 'bad' ? 0.55 : 1,
            }}
          >
            <span className="tabular font-mono" style={{ fontSize: u(1.25), fontWeight: 600 }}>
              {ratio.toFixed(1)}
            </span>
            <span
              className="flex items-center font-mono"
              style={{ fontSize: u(0.78), gap: u(0.3) }}
            >
              <VerdictIcon tone={verdict.tone} />
              {words.contrast.levels[verdict.level]}
            </span>
          </span>
        );
      })}
    </>
  );
}

function Typography({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const ink = inkOn(context.background ?? PAPER);
  const sizes = [
    { label: words.type.h1, size: 4.6, weight: 700, font: view.pairing.display.css },
    { label: words.type.h2, size: 2.8, weight: 600, font: view.pairing.display.css },
    { label: words.type.body, size: 1.35, weight: 400, font: view.pairing.text.css },
    { label: words.type.caption, size: 1, weight: 500, font: view.pairing.text.css },
  ];
  return (
    <SheetFrame
      context={context}
      lead={words.lead.typography}
      aside={
        <div className="flex flex-col" style={{ gap: u(1.4) }}>
          <span
            aria-hidden="true"
            style={{
              fontFamily: view.pairing.display.css,
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
          {[
            { family: view.pairing.display, role: words.type.display },
            { family: view.pairing.text, role: `${words.type.text} · ${words.type.licence}` },
          ].map(({ family, role }) => (
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
              className="m-0 truncate"
              style={{
                fontFamily: size.font,
                fontSize: u(size.size),
                fontWeight: size.weight,
                lineHeight: 1.1,
                letterSpacing: size.size > 2 ? '-0.02em' : '0',
              }}
            >
              {size.size > 2 ? view.name : words.type.sample}
            </p>
          </div>
        ))}
        <p
          className="m-0 border-t font-mono"
          style={{
            ...hairline(ink),
            fontSize: u(1),
            opacity: 0.7,
            paddingTop: u(1),
            letterSpacing: '0.04em',
          }}
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 àâçéèêëîïôûù
        </p>
      </div>
    </SheetFrame>
  );
}

function Tone({ context }: { readonly context: SheetContext }) {
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
                    borderRadius: u(1),
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

function Tokens({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const slug = (role: ColorRole): string =>
    role.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
  const lines = [
    ':root {',
    ...COLOR_ROLES.map((role) => `  --color-${slug(role)}: ${view.colors[role]};`),
    `  --font-display: '${view.pairing.display.name}';`,
    `  --font-text: '${view.pairing.text.name}';`,
    `  --logo-clear-space: ${String(view.rules.clearSpaceRatio)};`,
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
        className="m-0 h-full overflow-hidden font-mono"
        style={{
          background: code,
          color: inkOn(code),
          borderRadius: u(1),
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

export const RENDERERS: Readonly<Record<Exclude<PageType, 'mockup'>, Renderer>> = {
  cover: Cover,
  manifesto: Manifesto,
  logo: LogoPage,
  'clear-space': ClearSpace,
  'do-dont': DoDont,
  palette: Palette,
  contrast: Contrast,
  typography: Typography,
  'tone-of-voice': Tone,
  tokens: Tokens,
};
