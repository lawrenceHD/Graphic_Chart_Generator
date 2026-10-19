import { AnimatePresence, motion } from 'motion/react';
import { useReduce } from '../lib/motion-pref';
import { Check, Minus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { svgUrl, type Brand } from '../lib/brand';
import {
  buildScale,
  cmykOf,
  contrastRatio,
  formatOklch,
  inkOn,
  levelInfo,
  rgbOf,
} from '../lib/color';
import type { Palette, PaletteKey } from '../lib/palette';
import { spring } from '../lib/motion';
import { MOCKUPS } from '../mockups/Mockups';

// Pages of the generated charter. Each is a sheet sized by container queries (cqw), so the same page reads
// on a phone carousel and on the desktop canvas. Text on the page uses the brand's fonts, not the UI's.
export interface BoardProps {
  brand: Brand;
  palette: Palette;
  /** 0..1: how much of this page's data has arrived from the stream. */
  progress: number;
}

export interface BoardSpec {
  key: string;
  title: string;
  /** Analysis step after which the page can start filling. */
  step: 1 | 2 | 3 | 4;
  Component: (props: BoardProps) => ReactNode;
}

const ROLE_LABEL: Record<PaletteKey, string> = {
  primary: 'Principale',
  accent: 'Accent',
  light: 'Neutre clair',
  dark: 'Neutre sombre',
};

function Sheet({
  brand,
  title,
  page,
  children,
  dark = false,
  palette,
}: {
  brand: Brand;
  title: string;
  page: number;
  children: ReactNode;
  dark?: boolean;
  palette: Palette;
}) {
  return (
    <div
      className="@container relative flex aspect-[210/297] w-full flex-col overflow-hidden rounded-[22px] shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_30px_60px_-30px_rgb(0_0_0/0.7)]"
      style={{
        background: dark ? palette.dark : '#FFFFFF',
        color: dark ? '#FFFFFF' : palette.dark,
        fontFamily: brand.fonts.text,
      }}
    >
      <header className="flex items-baseline justify-between px-[7cqw] pt-[6cqw] text-[2.3cqw] uppercase tracking-[0.12em] opacity-60">
        <span>{brand.name} — Charte graphique</span>
        <span className="tabular">{String(page).padStart(2, '0')}</span>
      </header>
      <h2
        className="px-[7cqw] pt-[3cqw] text-[7.5cqw] font-semibold leading-none tracking-tight"
        style={{ fontFamily: brand.fonts.display }}
      >
        {title}
      </h2>
      <div className="relative flex-1 px-[7cqw] pb-[7cqw] pt-[5cqw]">{children}</div>
    </div>
  );
}

const Img = ({
  svg,
  className = '',
  alt = '',
}: {
  svg: string;
  className?: string;
  alt?: string;
}) => <img src={svgUrl(svg)} alt={alt} className={className} draggable={false} />;

/** Placeholder lines while a page waits for its data (layout of the final page, opacity pulse). */
export function Skeleton({ lines = 6 }: { lines?: number }) {
  return (
    <div className="space-y-[3cqw]" aria-hidden>
      <div className="skeleton h-[28cqw] rounded-[2cqw]" />
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton h-[2.4cqw] rounded-full"
          style={{ width: `${90 - ((index * 17) % 40)}%` }}
        />
      ))}
    </div>
  );
}

function CoverBoard({ brand, palette }: BoardProps) {
  const logo = inkOn(palette.primary) === '#FFFFFF' ? brand.mono.white : brand.mono.black;
  return (
    // The container holds no cqw value itself: its content does (inner block), sized from it.
    <div
      className="@container relative aspect-[210/297] w-full overflow-hidden rounded-[22px] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]"
      style={{
        background: palette.primary,
        color: inkOn(palette.primary),
        fontFamily: brand.fonts.text,
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-[8cqw]">
        <span className="text-[2.6cqw] uppercase tracking-[0.14em] opacity-75">
          Charte graphique · 2026
        </span>
        <Img
          svg={logo}
          alt={`Logo ${brand.name}`}
          className="mx-auto h-[38cqw] w-[60cqw] object-contain"
        />
        <div>
          <p
            className="text-[11cqw] font-semibold leading-[0.9] tracking-tight"
            style={{ fontFamily: brand.fonts.display }}
          >
            {brand.name}
          </p>
          <p className="mt-[2cqw] max-w-[70cqw] text-[3.2cqw] leading-snug opacity-80">
            {brand.brief}
          </p>
        </div>
      </div>
      <div
        className="absolute bottom-0 right-0 h-[18cqw] w-[18cqw] rounded-tl-full"
        style={{ background: palette.accent }}
      />
    </div>
  );
}

function LogoBoard({ brand, palette }: BoardProps) {
  const tiles = [
    { label: 'Couleur', bg: '#FFFFFF', svg: brand.logo, border: true },
    { label: 'Noir', bg: palette.light, svg: brand.mono.black },
    { label: 'Blanc', bg: palette.dark, svg: brand.mono.white },
    {
      label: 'Sur couleur',
      bg: palette.primary,
      svg: inkOn(palette.primary) === '#FFFFFF' ? brand.mono.white : brand.mono.black,
    },
  ];
  return (
    <Sheet brand={brand} title="Logo et variantes" page={2} palette={palette}>
      <div className="grid h-[44cqw] place-items-center rounded-[2cqw] border border-black/10">
        <Img
          svg={brand.logo}
          alt={`Logo ${brand.name} en couleur`}
          className="h-[30cqw] w-[60cqw] object-contain"
        />
      </div>
      <div className="mt-[4cqw] grid grid-cols-2 gap-[3cqw]">
        {tiles.map((tile) => (
          <figure key={tile.label} className="m-0">
            <div
              className={`grid h-[24cqw] place-items-center rounded-[1.6cqw] ${tile.border ? 'border border-black/10' : ''}`}
              style={{ background: tile.bg }}
            >
              <Img svg={tile.svg} className="h-[14cqw] w-[30cqw] object-contain" />
            </div>
            <figcaption className="mt-[1.2cqw] text-[2.4cqw] opacity-70">{tile.label}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-[4cqw] flex items-center gap-[3cqw]">
        <Img svg={brand.favicon} className="h-[10cqw] w-[10cqw] rounded-[2cqw]" alt="Favicon" />
        <p className="text-[2.4cqw] leading-snug opacity-70">
          Favicon : le logo occupe 80 % du carré. Variantes noir et blanc vectorielles, tracés
          conservés.
        </p>
      </div>
    </Sheet>
  );
}

function PaletteBoard({ brand, palette, progress }: BoardProps) {
  const reduce = useReduce();
  const keys: PaletteKey[] = ['primary', 'accent', 'light', 'dark'];
  const shown = Math.ceil(progress * (keys.length + 1));
  return (
    <Sheet brand={brand} title="Palette" page={3} palette={palette}>
      <div className="grid grid-cols-2 gap-[3cqw]">
        <AnimatePresence>
          {keys.slice(0, shown).map((key, index) => {
            const hex = palette[key];
            const [c, m, y, k] = cmykOf(hex);
            return (
              <motion.div
                key={key}
                layout
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduce ? { duration: 0.1 } : { ...spring, delay: index * 0.05 }}
                className={`overflow-hidden rounded-[2cqw] border border-black/10 ${index === 0 ? 'col-span-2' : ''}`}
              >
                <motion.div
                  className={index === 0 ? 'h-[30cqw]' : 'h-[20cqw]'}
                  animate={{ backgroundColor: hex }}
                  transition={{ duration: 0.25 }}
                  style={{ background: hex }}
                >
                  <span
                    className="block p-[2.4cqw] text-[2.6cqw] font-medium"
                    style={{ color: inkOn(hex) }}
                  >
                    {ROLE_LABEL[key]}
                  </span>
                </motion.div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-[2cqw] p-[2.4cqw] font-mono text-[2.1cqw] leading-relaxed">
                  <dt className="opacity-50">HEX</dt>
                  <dd className="m-0">{hex}</dd>
                  <dt className="opacity-50">RVB</dt>
                  <dd className="m-0">{rgbOf(hex).join(' ')}</dd>
                  <dt className="opacity-50">OKLCH</dt>
                  <dd className="m-0">{formatOklch(hex)}</dd>
                  <dt className="opacity-50">CMJN*</dt>
                  <dd className="m-0">{[c, m, y, k].join(' ')}</dd>
                </dl>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {progress >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-[4cqw]">
          <p className="mb-[1.5cqw] text-[2.3cqw] opacity-60">Échelle de la principale</p>
          <div className="flex overflow-hidden rounded-[1.4cqw]">
            {buildScale(palette.primary).map((step) => (
              <div
                key={step.step}
                className="h-[7cqw] flex-1"
                style={{ background: step.hex }}
                title={`${String(step.step)} ${step.hex}`}
              />
            ))}
          </div>
          <p className="mt-[2cqw] text-[1.9cqw] opacity-50">
            * CMJN indicatif, à valider avec l'imprimeur.
          </p>
        </motion.div>
      )}
    </Sheet>
  );
}

function ContrastBoard({ brand, palette }: BoardProps) {
  const keys: PaletteKey[] = ['primary', 'accent', 'light', 'dark'];
  const extra = ['#FFFFFF', '#000000'];
  const colors = [...keys.map((key) => palette[key]), ...extra];
  const Icon = ({ tone }: { tone: string }) =>
    tone === 'ok' ? (
      <Check className="h-[2.4cqw] w-[2.4cqw]" />
    ) : tone === 'mid' ? (
      <Minus className="h-[2.4cqw] w-[2.4cqw]" />
    ) : (
      <X className="h-[2.4cqw] w-[2.4cqw]" />
    );
  return (
    <Sheet brand={brand} title="Contrastes" page={4} palette={palette}>
      <p className="text-[2.5cqw] leading-snug opacity-70">
        Texte (lignes) sur fond (colonnes), WCAG 2.2. Chaque niveau est indiqué par une icône et un
        libellé.
      </p>
      <div
        className="mt-[3cqw] grid gap-[0.8cqw]"
        style={{ gridTemplateColumns: `8cqw repeat(${colors.length}, 1fr)` }}
      >
        <div />
        {colors.map((bg) => (
          <div
            key={bg}
            className="h-[5cqw] rounded-[1cqw] border border-black/10"
            style={{ background: bg }}
          />
        ))}
        {colors.map((text) => (
          <Row key={text} text={text} colors={colors} Icon={Icon} />
        ))}
      </div>
    </Sheet>
  );
}

function Row({
  text,
  colors,
  Icon,
}: {
  text: string;
  colors: string[];
  Icon: (props: { tone: string }) => ReactNode;
}) {
  return (
    <>
      <div
        className="h-[9cqw] rounded-[1cqw] border border-black/10"
        style={{ background: text }}
      />
      {colors.map((bg) => {
        if (bg === text) return <div key={bg} className="rounded-[1cqw] bg-black/5" />;
        const ratio = contrastRatio(text, bg);
        const info = levelInfo(ratio);
        return (
          <div
            key={bg}
            className="flex flex-col items-center justify-center rounded-[1cqw] font-mono"
            style={{ background: bg, color: text }}
          >
            <span className="text-[2.6cqw] font-semibold tabular">{ratio.toFixed(1)}</span>
            <span className="flex items-center gap-[0.5cqw] text-[1.7cqw]">
              <Icon tone={info.tone} />
              {info.label}
            </span>
          </div>
        );
      })}
    </>
  );
}

function TypeBoard({ brand, palette }: BoardProps) {
  const sizes = [
    { label: 'Titre 1', size: '11cqw', weight: 600 },
    { label: 'Titre 2', size: '7cqw', weight: 600 },
    { label: 'Titre 3', size: '4.6cqw', weight: 500 },
  ];
  return (
    <Sheet brand={brand} title="Typographie" page={5} palette={palette}>
      <div className="flex items-end justify-between border-b border-black/10 pb-[3cqw]">
        <span
          className="text-[26cqw] leading-[0.8]"
          style={{ fontFamily: brand.fonts.display, color: palette.primary }}
        >
          Aa
        </span>
        <div className="text-right text-[2.4cqw] leading-relaxed">
          <p className="m-0 font-semibold">{brand.fonts.display.replace(' Variable', '')}</p>
          <p className="m-0 opacity-60">Titres · licence libre (OFL)</p>
          <p className="m-0 mt-[1.5cqw] font-semibold">
            {brand.fonts.text.replace(' Variable', '')}
          </p>
          <p className="m-0 opacity-60">Texte · licence libre (OFL)</p>
        </div>
      </div>
      <div className="mt-[4cqw] space-y-[2.4cqw]">
        {sizes.map((size) => (
          <div key={size.label} className="flex items-baseline gap-[3cqw]">
            <span className="w-[12cqw] shrink-0 font-mono text-[1.9cqw] opacity-50">
              {size.label}
            </span>
            <span
              className="truncate leading-none tracking-tight"
              style={{
                fontFamily: brand.fonts.display,
                fontSize: size.size,
                fontWeight: size.weight,
              }}
            >
              {brand.name}
            </span>
          </div>
        ))}
        <div className="flex gap-[3cqw]">
          <span className="w-[12cqw] shrink-0 font-mono text-[1.9cqw] opacity-50">Texte</span>
          <p className="m-0 text-[2.8cqw] leading-[1.55]">
            {brand.brief} La typographie porte la voix de la marque : lisible, posée, cohérente sur
            tous les supports.
          </p>
        </div>
      </div>
      <p className="absolute bottom-[6cqw] left-[7cqw] right-[7cqw] font-mono text-[2cqw] opacity-50">
        ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · àâçéèêëîïôûù
      </p>
    </Sheet>
  );
}

const DONT_LABEL: Record<string, string> = {
  distort: 'Ne pas déformer',
  rotate: 'Ne pas pivoter',
  recolor: 'Ne pas recolorer',
  'bad-background': 'Pas de fond peu contrasté',
};

function RulesBoard({ brand, palette }: BoardProps) {
  return (
    <Sheet brand={brand} title="Règles d'usage" page={6} palette={palette}>
      <div className="grid grid-cols-[1fr_1fr] gap-[3cqw]">
        <div
          className="col-span-2 grid h-[40cqw] place-items-center rounded-[2cqw]"
          style={{ background: '#2b2b2b' }}
        >
          <Img
            svg={brand.clearSpace}
            alt="Zone de protection"
            className="h-[34cqw] w-[70cqw] object-contain"
          />
        </div>
        <p className="col-span-2 m-0 text-[2.4cqw] leading-snug opacity-70">
          Zone de protection : X = 25 % de la hauteur du logo. Aucun élément ne doit y entrer.
        </p>
        {brand.donts.map((dont) => (
          <figure key={dont.kind} className="m-0">
            <div className="relative grid h-[22cqw] place-items-center overflow-hidden rounded-[1.6cqw] border border-black/10 bg-[#f4f4f4]">
              <Img svg={dont.svg} className="h-full w-full object-contain p-[2cqw]" />
              <span className="absolute right-[1.5cqw] top-[1.5cqw] grid h-[4.6cqw] w-[4.6cqw] place-items-center rounded-full bg-[#c62828] text-white">
                <X className="h-[3cqw] w-[3cqw]" />
              </span>
            </div>
            <figcaption className="mt-[1cqw] text-[2.3cqw]">
              {DONT_LABEL[dont.kind] ?? dont.kind}
            </figcaption>
          </figure>
        ))}
      </div>
    </Sheet>
  );
}

function MockupBoard({ brand, palette }: BoardProps) {
  return (
    <Sheet brand={brand} title="En situation" page={7} palette={palette} dark>
      <div className="grid grid-cols-2 gap-[2.4cqw]">
        {MOCKUPS.slice(0, 6).map(({ key, Component }, index) => (
          <Component
            key={key}
            brand={brand}
            palette={palette}
            className={`${index === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}
          />
        ))}
      </div>
    </Sheet>
  );
}

export const BOARDS: BoardSpec[] = [
  { key: 'cover', title: 'Couverture', step: 1, Component: CoverBoard },
  { key: 'logo', title: 'Logo', step: 1, Component: LogoBoard },
  { key: 'palette', title: 'Palette', step: 2, Component: PaletteBoard },
  { key: 'contrast', title: 'Contrastes', step: 2, Component: ContrastBoard },
  { key: 'type', title: 'Typographie', step: 3, Component: TypeBoard },
  { key: 'rules', title: "Règles d'usage", step: 4, Component: RulesBoard },
  { key: 'mockups', title: 'En situation', step: 4, Component: MockupBoard },
];

export { Sheet };
