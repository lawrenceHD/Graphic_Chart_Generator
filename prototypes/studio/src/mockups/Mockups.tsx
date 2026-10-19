import type { CSSProperties, ReactNode } from 'react';
import { svgUrl, type Brand } from '../lib/brand';
import { inkOn } from '../lib/color';

// Vector stand-ins for the mockup scenes (the photographic scenes are T-025). Every piece takes its colours
// and logo from the brand, so switching brand restyles all of them at once.
export interface MockupProps {
  brand: Brand;
  /** Palette overrides from the inspector (role → hex). */
  palette: { primary: string; accent: string; dark: string; light: string };
  className?: string;
}

const Img = ({
  svg,
  className,
  style,
}: {
  svg: string;
  className?: string;
  style?: CSSProperties;
}) => <img src={svgUrl(svg)} alt="" className={className} style={style} draggable={false} />;

function Frame({
  children,
  label,
  className = '',
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <figure
      className={`relative m-0 overflow-hidden rounded-[var(--radius-lg)] ${className}`}
      aria-label={label}
    >
      {children}
    </figure>
  );
}

export function BusinessCards({ brand, palette, className = '' }: MockupProps) {
  const onPrimary = inkOn(palette.primary);
  const logo = onPrimary === '#FFFFFF' ? brand.mono.white : brand.mono.black;
  return (
    <Frame label={`Cartes de visite ${brand.name}`} className={`bg-[#d9d6d0] ${className}`}>
      <div className="absolute inset-0 grid place-items-center [perspective:900px]">
        <div
          className="absolute aspect-[85/55] w-[62%] rounded-[6px] shadow-[0_30px_40px_-20px_rgb(0_0_0/0.45)]"
          style={{
            background: palette.light,
            transform: 'translate(10%, 14%) rotateX(38deg) rotateZ(-22deg)',
          }}
        >
          <div
            className="flex h-full flex-col justify-end gap-[3%] p-[7%]"
            style={{ color: palette.dark }}
          >
            <div
              className="h-[7%] w-[46%] rounded-full"
              style={{ background: palette.dark, opacity: 0.85 }}
            />
            <div
              className="h-[5%] w-[32%] rounded-full"
              style={{ background: palette.dark, opacity: 0.4 }}
            />
            <div
              className="mt-[4%] h-[5%] w-[40%] rounded-full"
              style={{ background: palette.accent }}
            />
          </div>
        </div>
        <div
          className="absolute grid aspect-[85/55] w-[62%] place-items-center rounded-[6px] shadow-[0_30px_40px_-20px_rgb(0_0_0/0.5)]"
          style={{
            background: palette.primary,
            transform: 'translate(-8%, -10%) rotateX(38deg) rotateZ(-22deg)',
          }}
        >
          <Img svg={logo} className="h-[46%] w-[46%] object-contain" />
        </div>
      </div>
    </Frame>
  );
}

export function AppIcon({ brand, palette, className = '' }: MockupProps) {
  const tiles = [
    '#e6e3dd',
    '#cfd8e3',
    '#f1d9c9',
    '#d6e5d3',
    '#e8d6e8',
    '#d9d9d9',
    '#f3e7c4',
    '#cde3e6',
  ];
  return (
    <Frame label={`Icône d'application ${brand.name}`} className={`bg-[#1a1c22] ${className}`}>
      <div className="absolute left-1/2 top-[8%] h-[120%] w-[58%] -translate-x-1/2 rounded-[14%] border-[6px] border-[#0c0d10] bg-gradient-to-b from-[#2c3340] to-[#151821] p-[7%]">
        <div className="grid grid-cols-4 gap-[9%]">
          {tiles.slice(0, 5).map((tile, index) => (
            <div
              key={index}
              className="aspect-square rounded-[24%] opacity-70"
              style={{ background: tile }}
            />
          ))}
          <div className="relative aspect-square">
            <div
              className="absolute inset-0 rounded-[24%] shadow-[0_6px_14px_rgb(0_0_0/0.4)]"
              style={{ background: palette.light }}
            >
              <Img svg={brand.favicon} className="h-full w-full rounded-[24%]" />
            </div>
          </div>
          {tiles.slice(5).map((tile, index) => (
            <div
              key={index}
              className="aspect-square rounded-[24%] opacity-70"
              style={{ background: tile }}
            />
          ))}
        </div>
        <p className="mt-[6%] text-center font-sans text-[9px] font-medium text-white/85">
          {brand.name}
        </p>
      </div>
    </Frame>
  );
}

export function Storefront({ brand, palette, className = '' }: MockupProps) {
  const stripes = Array.from({ length: 10 }, (_, index) => index);
  return (
    <Frame label={`Devanture ${brand.name}`} className={className}>
      <div className="absolute inset-0" style={{ background: palette.dark }} />
      <div className="absolute inset-x-0 top-0 h-[36%]" style={{ background: palette.light }}>
        <div className="flex h-full items-center justify-center gap-[4%] px-[8%]">
          <Img svg={brand.logo} className="h-[62%] w-auto max-w-[40%] object-contain" />
          <span
            className="truncate font-display text-[clamp(14px,4cqw,34px)] font-bold tracking-tight"
            style={{ color: palette.dark }}
          >
            {brand.name}
          </span>
        </div>
      </div>
      <svg
        className="absolute inset-x-0 top-[36%] h-[16%] w-full"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        aria-hidden
      >
        {stripes.map((index) => (
          <path
            key={index}
            d={`M${index * 10} 0 h10 v12 q-5 6 -10 0 z`}
            fill={index % 2 === 0 ? palette.primary : palette.light}
          />
        ))}
      </svg>
      <div className="absolute inset-x-[10%] bottom-0 top-[58%] grid grid-cols-[1fr_0.6fr_1fr] gap-[4%]">
        <div className="rounded-t-[6px] bg-white/10" />
        <div className="rounded-t-[6px]" style={{ background: palette.accent }} />
        <div className="rounded-t-[6px] bg-white/10" />
      </div>
    </Frame>
  );
}

export function Tote({ brand, palette, className = '' }: MockupProps) {
  return (
    <Frame label={`Sac en toile ${brand.name}`} className={`bg-[#cfc8bd] ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
        <path d="M70 70 C70 28, 130 28, 130 70" fill="none" stroke={palette.dark} strokeWidth="6" />
        <path d="M46 66 h108 l10 120 h-128 z" fill={palette.light} />
        <path d="M46 66 h108 l1 10 h-110 z" fill="rgb(0 0 0 / 0.08)" />
      </svg>
      <Img
        svg={brand.logo}
        className="absolute left-1/2 top-[52%] h-[30%] w-[38%] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    </Frame>
  );
}

export function Tshirt({ brand, palette, className = '' }: MockupProps) {
  const logo = inkOn(palette.primary) === '#FFFFFF' ? brand.mono.white : brand.mono.black;
  return (
    <Frame label={`T-shirt ${brand.name}`} className={`bg-[#e9e5de] ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 200" aria-hidden>
        <path
          d="M72 30 q28 18 56 0 l40 18 l-14 34 l-18 -8 v108 h-72 v-108 l-18 8 l-14 -34 z"
          fill={palette.primary}
        />
        <path d="M72 30 q28 18 56 0" fill="none" stroke="rgb(0 0 0 / 0.18)" strokeWidth="4" />
      </svg>
      <Img
        svg={logo}
        className="absolute left-1/2 top-[40%] h-[20%] w-[24%] -translate-x-1/2 object-contain"
      />
    </Frame>
  );
}

export function Letterhead({ brand, palette, className = '' }: MockupProps) {
  return (
    <Frame label={`Papier à en-tête ${brand.name}`} className={`bg-[#bfbab2] ${className}`}>
      <div className="absolute left-1/2 top-[10%] aspect-[210/297] w-[56%] -translate-x-1/2 rotate-[-4deg] bg-white p-[6%] shadow-[0_24px_30px_-18px_rgb(0_0_0/0.5)]">
        <div className="flex items-center gap-[6%]">
          <Img svg={brand.logo} className="h-[22px] w-auto max-w-[40%] object-contain" />
          <span className="font-display text-[10px] font-semibold" style={{ color: palette.dark }}>
            {brand.name}
          </span>
        </div>
        <div className="mt-[16%] space-y-[5%]">
          {[90, 96, 84, 92, 70, 88, 60].map((width, index) => (
            <div
              key={index}
              className="h-[3px] rounded-full bg-black/15"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div
          className="absolute inset-x-[6%] bottom-[5%] h-[3px] rounded-full"
          style={{ background: palette.primary }}
        />
      </div>
    </Frame>
  );
}

export function PhoneScreen({ brand, palette, className = '' }: MockupProps) {
  const onPrimary = inkOn(palette.primary);
  const onAccent = inkOn(palette.accent);
  return (
    <Frame label={`Écran d'application ${brand.name}`} className={`bg-[#e4e0d8] ${className}`}>
      <div
        className="absolute left-1/2 top-[7%] h-[115%] w-[54%] -translate-x-1/2 overflow-hidden rounded-[22px] border-[5px] border-[#111] shadow-[0_20px_30px_-16px_rgb(0_0_0/0.5)]"
        style={{ background: palette.light }}
      >
        <div
          className="flex h-[22%] items-end gap-2 p-[8%]"
          style={{ background: palette.primary, color: onPrimary }}
        >
          <Img
            svg={onPrimary === '#FFFFFF' ? brand.mono.white : brand.mono.black}
            className="h-5 w-5 object-contain"
          />
          <span className="font-display text-[11px] font-semibold">{brand.name}</span>
        </div>
        <div className="space-y-[6%] p-[8%]">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center gap-2 rounded-[8px] bg-white/80 p-2 shadow-sm"
            >
              <div
                className="h-5 w-5 rounded-full"
                style={{ background: row === 1 ? palette.accent : palette.primary, opacity: 0.85 }}
              />
              <div className="flex-1 space-y-1">
                <div className="h-[3px] w-[70%] rounded-full bg-black/30" />
                <div className="h-[3px] w-[45%] rounded-full bg-black/15" />
              </div>
            </div>
          ))}
          <div
            className="rounded-full py-2 text-center text-[9px] font-semibold"
            style={{ background: palette.accent, color: onAccent }}
          >
            Continuer
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function SocialPost({ brand, palette, className = '' }: MockupProps) {
  const onAccent = inkOn(palette.accent);
  return (
    <Frame label={`Publication sociale ${brand.name}`} className={className}>
      <div className="absolute inset-0" style={{ background: palette.accent }} />
      <svg
        className="absolute -right-[20%] -top-[20%] h-[90%] w-[90%] opacity-20"
        viewBox="0 0 100 100"
        aria-hidden
      >
        {Array.from({ length: 6 }, (_, index) => (
          <circle
            key={index}
            cx={50}
            cy={50}
            r={8 + index * 8}
            fill="none"
            stroke={palette.primary}
            strokeWidth="3"
          />
        ))}
      </svg>
      <div
        className="absolute inset-0 flex flex-col justify-between p-[8%]"
        style={{ color: onAccent }}
      >
        <Img
          svg={onAccent === '#FFFFFF' ? brand.mono.white : brand.mono.black}
          className="h-[14%] w-[14%] object-contain"
        />
        <p className="font-display text-[clamp(16px,6cqw,40px)] font-bold leading-[0.95] tracking-tight">
          Nouvelle saison,
          <br />
          même énergie.
        </p>
      </div>
    </Frame>
  );
}

export const MOCKUPS = [
  { key: 'cards', label: 'Cartes de visite', Component: BusinessCards },
  { key: 'phone', label: 'Application', Component: PhoneScreen },
  { key: 'store', label: 'Devanture', Component: Storefront },
  { key: 'icon', label: 'Icône', Component: AppIcon },
  { key: 'tee', label: 'T-shirt', Component: Tshirt },
  { key: 'tote', label: 'Tote bag', Component: Tote },
  { key: 'letter', label: 'Papier à en-tête', Component: Letterhead },
  { key: 'social', label: 'Réseaux sociaux', Component: SocialPost },
] as const;
