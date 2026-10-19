import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ArrowRight, Check, ImageUp, Loader2, Play } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BOARDS } from '../boards/Boards';
import { BRANDS, WALL, svgUrl, type Brand } from '../lib/brand';
import { contrastRatio, inkOn, levelInfo } from '../lib/color';
import { reveal, softSpring, spring, useRise } from '../lib/motion';
import { paletteOf } from '../lib/palette';
import { MOCKUPS } from '../mockups/Mockups';
import { navigate, useMediaQuery } from '../router';

const Cover = BOARDS[0]!.Component;
const WORDS = ['charte', 'palette', 'typo', 'identité'];

export function Landing() {
  return (
    <div className="theme-paper min-h-dvh overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <LogoWall />
        <Manifesto />
        <Journey />
        <Inside />
        <MockupShowcase />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-line/60 bg-canvas/75 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4"
        aria-label="Navigation principale"
      >
        <a href="#/" className="font-display text-2xl font-extrabold tracking-tight">
          Charta
        </a>
        <div className="hidden flex-1 items-center gap-6 text-sm text-ink-2 md:flex">
          <a href="#fonctionnement" className="flex h-11 items-center hover:text-ink">
            Fonctionnement
          </a>
          <a href="#charte" className="flex h-11 items-center hover:text-ink">
            La charte
          </a>
          <a href="#mockups" className="flex h-11 items-center hover:text-ink">
            Mockups
          </a>
        </div>
        <motion.a
          href="#/start"
          whileTap={{ scale: 0.97 }}
          className="ml-auto flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent md:ml-0"
        >
          Essayer <ArrowRight className="h-4 w-4" aria-hidden />
        </motion.a>
      </nav>
    </header>
  );
}

function WordPill() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(timer);
  }, [reduce]);
  const brand = BRANDS[index % BRANDS.length]!;
  const bg = brand.roles.primary.hex;
  return (
    <motion.span
      layout
      transition={spring}
      className="relative mx-[0.08em] inline-flex -rotate-2 overflow-hidden rounded-[0.32em] px-[0.22em] align-baseline"
      animate={{ backgroundColor: bg }}
      style={{ background: bg, color: inkOn(bg) }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={reveal}
          className="inline-block"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-16">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reveal}
        className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2"
      >
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden /> Prototype · palettes
        calculées par le vrai moteur
      </motion.p>
      <motion.h1
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...reveal, delay: 0.05 }}
        className="m-0 text-center font-display text-[clamp(44px,12vw,128px)] font-extrabold leading-[0.88] tracking-[-0.04em]"
      >
        Votre logo,
        <br />
        votre <WordPill />
        <br />
        en direct.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...reveal, delay: 0.2 }}
        className="mx-auto mt-6 max-w-xl text-center text-[17px] leading-relaxed text-ink-2"
      >
        Déposez un logo. Palette, contrastes, variantes, typographie, règles et mockups se
        construisent sous vos yeux, puis se modifient d'un mot.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...reveal, delay: 0.3 }}
        className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <motion.a
          href="#/start"
          whileTap={{ scale: 0.97 }}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-semibold text-on-accent sm:w-auto"
        >
          <ImageUp className="h-5 w-5" aria-hidden /> Déposer mon logo
        </motion.a>
        <motion.a
          href={`#/studio/${BRANDS[0]!.slug}`}
          whileTap={{ scale: 0.97 }}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line-strong px-7 text-base font-medium sm:w-auto"
        >
          <Play className="h-4 w-4" aria-hidden /> Voir le studio en action
        </motion.a>
      </motion.div>
      <Fan />
    </section>
  );
}

/** The signature move of the page: charters fanning out from a stack (card-fan reference). */
function Fan() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  // Parallax by translation only: a 3D rotation here stopped Chrome from painting the cards' content.
  const shift = useSpring(useTransform(x, [-1, 1], [-18, 18]), softSpring);
  const brands = BRANDS.slice(0, 5);
  const mid = (brands.length - 1) / 2;
  return (
    <div
      className="relative mx-auto mt-12 h-[min(78vw,460px)] max-w-4xl"
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      }}
      onPointerLeave={() => x.set(0)}
      aria-hidden
      data-decorative
    >
      <motion.div style={{ x: shift }} className="absolute inset-0">
        {brands.map((brand, index) => {
          const offset = index - mid;
          return (
            <motion.div
              key={brand.slug}
              className="absolute bottom-0 left-1/2 w-[min(36vw,230px)] origin-bottom"
              initial={
                reduce ? { opacity: 0, x: '-50%' } : { opacity: 0, x: '-50%', y: 80, rotate: 0 }
              }
              whileInView={{
                opacity: 1,
                x: `calc(-50% + ${String(offset * 46)}%)`,
                y: Math.abs(offset) * 18,
                rotate: offset * 9,
              }}
              viewport={{ once: true }}
              whileHover={
                reduce ? undefined : { y: Math.abs(offset) * 18 - 22, transition: spring }
              }
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { ...softSpring, delay: 0.35 + Math.abs(offset) * 0.08 }
              }
              style={{ zIndex: 10 - Math.abs(offset) }}
            >
              <Cover brand={brand} palette={paletteOf(brand)} progress={1} />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function LogoWall() {
  const half = Math.ceil(WALL.length / 2);
  const rows = [WALL.slice(0, half), WALL.slice(half)];
  return (
    <section className="border-y border-line py-8" aria-label="Logos de la bibliothèque de test">
      <p className="mb-5 text-center text-sm text-ink-3">
        Éprouvé sur une bibliothèque de logos réels, de toutes formes
      </p>
      <div className="space-y-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex w-max gap-4 marquee"
            style={{ animationDirection: r ? 'reverse' : 'normal' }}
          >
            {[...row, ...row].map((logo, index) => (
              <div
                key={index}
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-[18px] border border-line p-3 sm:h-20 sm:w-20 ${logo.dark ? 'bg-[oklch(0.22_0.01_60)]' : 'bg-surface'}`}
              >
                <img
                  src={svgUrl(logo.svg)}
                  alt={index < row.length ? logo.name : ''}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const STICKERS = [
  { text: 'WCAG 2.2', rotate: -12, x: '4%', y: '6%' },
  { text: 'SVG vectoriel', rotate: 8, x: '70%', y: '2%' },
  { text: 'Annulable', rotate: -6, x: '78%', y: '72%' },
  { text: 'Design tokens', rotate: 10, x: '2%', y: '74%' },
  { text: 'CMJN indicatif', rotate: -4, x: '40%', y: '86%' },
];

function Manifesto() {
  const reduce = useReducedMotion();
  const rise = useRise();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <motion.h2
        {...rise}
        className="relative z-10 m-0 text-center font-display text-[clamp(40px,9vw,104px)] font-extrabold leading-[0.9] tracking-[-0.04em]"
      >
        Une charte,
        <br />
        pas un moodboard.
      </motion.h2>
      <p className="relative z-10 mx-auto mt-6 max-w-lg text-center text-ink-2">
        Des règles mesurées : ratios de contraste calculés, variantes vérifiées, zone de protection,
        interdits illustrés avec votre propre logo.
      </p>
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
        {STICKERS.map((sticker, index) => {
          const brand = BRANDS[index % BRANDS.length]!;
          const bg = index % 2 ? brand.roles.accent.hex : brand.roles.primary.hex;
          return (
            <motion.span
              key={sticker.text}
              className="absolute rounded-full px-4 py-2 font-display text-lg font-bold shadow-[0_10px_20px_-10px_rgb(0_0_0/0.4)]"
              style={{ left: sticker.x, top: sticker.y, background: bg, color: inkOn(bg) }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -60, rotate: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, rotate: sticker.rotate, scale: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 260, damping: 14, delay: index * 0.09 }
              }
            >
              {sticker.text}
            </motion.span>
          );
        })}
      </div>
    </section>
  );
}

const JOURNEY = [
  {
    title: 'Déposez',
    text: 'Votre logo en SVG, PNG ou JPEG. Le fichier est vérifié et assaini avant toute lecture.',
  },
  {
    title: 'Regardez',
    text: 'Quatre étapes en direct : lecture du logo, palette et contrastes, typographie, assemblage.',
  },
  {
    title: 'Ajustez',
    text: "Changez une couleur, une police, demandez au copilote : chaque modification s'annule.",
  },
];

/** Pinned on wide screens: the visual on the right follows the step being read (scroll-driven). */
function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });
  const [step, setStep] = useState(0);
  useEffect(
    () => scrollYProgress.on('change', (value) => setStep(Math.min(2, Math.floor(value * 3)))),
    [scrollYProgress],
  );
  return (
    <section
      id="fonctionnement"
      className="bg-[oklch(0.2_0.01_60)] py-20 text-[oklch(0.97_0.008_85)] sm:py-28"
    >
      <div ref={ref} className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
        <div className="space-y-[40vh] md:py-[20vh]">
          {JOURNEY.map((item, index) => (
            <JourneyStep key={item.title} index={index} active={step === index} {...item} />
          ))}
        </div>
        <div className="sticky top-24 hidden h-[70vh] items-center md:flex">
          <JourneyVisual step={step} progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function JourneyStep({
  index,
  title,
  text,
  active,
}: {
  index: number;
  title: string;
  text: string;
  active: boolean;
}) {
  // Only the pinned (wide) layout dims the steps not being read; on a phone each step carries its own visual.
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <motion.div animate={{ opacity: active || !wide ? 1 : 0.65 }} transition={{ duration: 0.3 }}>
      <span className="font-mono text-sm">0{index + 1}</span>
      <h3 className="m-0 mt-2 font-display text-[clamp(40px,7vw,76px)] font-extrabold leading-none tracking-tight">
        {title}
      </h3>
      <p className="mt-4 max-w-sm text-lg leading-relaxed">{text}</p>
      <div className="mt-8 md:hidden">
        <JourneyVisual step={index} />
      </div>
    </motion.div>
  );
}

function JourneyVisual({ step, progress }: { step: number; progress?: MotionValue<number> }) {
  const brand = BRANDS[0]!;
  const palette = paletteOf(brand);
  const fallback = useMotionValue(1);
  const rotate = useTransform(progress ?? fallback, [0, 1], [-3, 3]);
  return (
    <motion.div
      aria-hidden
      data-decorative
      style={{ rotate }}
      className="relative aspect-square w-full max-w-md overflow-hidden rounded-[28px] bg-[oklch(0.27_0.01_60)] p-6"
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid h-full place-items-center rounded-[20px] border-2 border-dashed border-white/25"
          >
            <motion.img
              src={svgUrl(brand.logo)}
              alt=""
              className="h-28 w-28 rounded-[20px] bg-white p-4"
              initial={{ y: -140, rotate: -14 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            />
            <span className="flex items-center gap-2 text-sm opacity-80">
              <Check className="h-4 w-4 text-[oklch(0.74_0.17_150)]" aria-hidden /> Fichier vérifié
            </span>
          </motion.div>
        )}
        {step === 1 && (
          <motion.ol
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="m-0 flex h-full list-none flex-col justify-center gap-3 p-0"
          >
            {['Lecture du logo', 'Palette et contrastes', 'Typographie', 'Assemblage'].map(
              (label, index) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...reveal, delay: index * 0.25 }}
                  className="flex items-center gap-3 rounded-[14px] bg-white/8 p-3"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...spring, delay: index * 0.25 + 0.3 }}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[oklch(0.74_0.17_150)] text-[oklch(0.2_0.01_60)]"
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </motion.span>
                  {label}
                  {index === 1 && (
                    <span className="ml-auto flex gap-1">
                      {Object.values(palette).map((hex, k) => (
                        <motion.span
                          key={hex}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...spring, delay: 0.7 + k * 0.08 }}
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ background: hex }}
                        />
                      ))}
                    </span>
                  )}
                </motion.li>
              ),
            )}
          </motion.ol>
        )}
        {step === 2 && (
          <motion.div
            key="pages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            {[0, 1, 2].map((index) => {
              const Board = BOARDS[[2, 1, 0][index]!]!.Component;
              return (
                <motion.div
                  key={index}
                  className="absolute left-1/2 top-1/2 w-[46%]"
                  initial={{ x: '-50%', y: '-40%', rotate: 0, opacity: 0 }}
                  animate={{
                    x: `${String(-50 + (index - 1) * 42)}%`,
                    y: '-50%',
                    rotate: (index - 1) * 7,
                    opacity: 1,
                  }}
                  transition={{ ...softSpring, delay: index * 0.1 }}
                >
                  <Board brand={brand} palette={palette} progress={1} />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BrandChips({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  return (
    <div
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
      role="radiogroup"
      aria-label="Marque d'exemple"
    >
      {BRANDS.map((brand) => {
        const on = brand.slug === value;
        return (
          <button
            key={brand.slug}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(brand.slug)}
            className={`relative flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm ${on ? 'border-transparent' : 'border-line'}`}
          >
            {on && (
              <motion.span
                layoutId="brand-chip"
                className="absolute inset-0 rounded-full bg-accent"
                transition={spring}
              />
            )}
            <img
              src={svgUrl(brand.logo)}
              alt=""
              className="relative h-5 w-5 rounded-[4px] bg-white object-contain p-0.5"
            />
            <span className={`relative ${on ? 'text-on-accent' : ''}`}>{brand.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function Inside() {
  const [slug, setSlug] = useState(BRANDS[0]!.slug);
  const brand = BRANDS.find((b) => b.slug === slug)!;
  const palette = paletteOf(brand);
  const rise = useRise();
  const swatches = [palette.primary, palette.accent, palette.light, palette.dark];
  return (
    <section id="charte" className="mx-auto max-w-6xl px-4 py-24">
      <motion.h2
        {...rise}
        className="m-0 max-w-3xl font-display text-[clamp(36px,7vw,80px)] font-extrabold leading-[0.92] tracking-[-0.03em]"
      >
        Tout ce que contient la charte.
      </motion.h2>
      <div className="mt-8">
        <BrandChips value={slug} onChange={setSlug} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3 md:grid-rows-[auto_auto]">
        <Tile
          className="md:col-span-2 md:row-span-2"
          title="Palette extraite du logo"
          note="Rôles attribués par le moteur : principale, accent, neutres."
        >
          <div className="grid h-full min-h-[260px] grid-cols-4 gap-2">
            {swatches.map((hex, index) => (
              <motion.div
                key={index}
                layout
                className={`flex flex-col justify-end rounded-[16px] p-3 ${index === 0 ? 'col-span-4 min-h-[160px] sm:col-span-2 sm:row-span-2' : 'col-span-2 min-h-[80px] sm:col-span-1'}`}
                animate={{ backgroundColor: hex }}
                transition={{ duration: 0.4 }}
                style={{ background: hex, color: inkOn(hex) }}
              >
                <span className="font-mono text-xs">{hex}</span>
              </motion.div>
            ))}
          </div>
        </Tile>
        <Tile
          title="Contrastes mesurés"
          note="Ratio WCAG 2.2, icône et libellé pour chaque niveau."
        >
          <ul className="m-0 list-none space-y-2 p-0">
            {[
              [palette.dark, palette.light],
              [palette.light, palette.primary],
              [palette.primary, palette.light],
            ].map(([text, bg]) => {
              const ratio = contrastRatio(text!, bg!);
              const info = levelInfo(ratio);
              return (
                <li
                  key={`${text}${bg}`}
                  className="flex items-center justify-between rounded-[12px] px-3 py-2"
                  style={{ background: bg, color: text }}
                >
                  <span className="font-display font-bold">Aa</span>
                  <span className="font-mono text-sm tabular">
                    {ratio.toFixed(2)} · {info.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </Tile>
        <Tile title="Variantes" note="Couleur, noir, blanc : vectorielles.">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['#FFFFFF', brand.logo],
              [palette.light, brand.mono.black],
              [palette.dark, brand.mono.white],
            ].map(([bg, svg], index) => (
              <div
                key={index}
                className="grid aspect-square place-items-center rounded-[12px] border border-line"
                style={{ background: bg }}
              >
                <img src={svgUrl(svg!)} alt="" className="h-3/5 w-3/5 object-contain" />
              </div>
            ))}
          </div>
        </Tile>
      </div>
    </section>
  );
}

function Tile({
  title,
  note,
  children,
  className = '',
}: {
  title: string;
  note: string;
  children: ReactNode;
  className?: string;
}) {
  const rise = useRise();
  return (
    <motion.article
      {...rise}
      className={`flex flex-col gap-4 rounded-[28px] border border-line bg-surface p-5 ${className}`}
    >
      <div>
        <h3 className="m-0 text-lg font-semibold">{title}</h3>
        <p className="m-0 mt-1 text-sm text-ink-3">{note}</p>
      </div>
      <div className="flex-1">{children}</div>
    </motion.article>
  );
}

function MockupShowcase() {
  const reduce = useReducedMotion();
  const [slug, setSlug] = useState(BRANDS[2]!.slug);
  const brand: Brand = BRANDS.find((b) => b.slug === slug)!;
  const palette = paletteOf(brand);
  const rise = useRise();
  return (
    <section id="mockups" className="bg-elevated py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.h2
          {...rise}
          className="m-0 font-display text-[clamp(36px,7vw,80px)] font-extrabold leading-[0.92] tracking-[-0.03em]"
        >
          Votre marque,{' '}
          <span className="inline-block -rotate-2 rounded-[0.3em] bg-accent px-[0.2em] text-on-accent">
            en situation
          </span>
          .
        </motion.h2>
        <p className="mt-4 max-w-lg text-ink-2">
          Choisissez une marque : tous les supports se recolorent en même temps.
        </p>
        <div className="mt-6">
          <BrandChips value={slug} onChange={setSlug} />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {MOCKUPS.map(({ key, label, Component }, index) => (
            <motion.figure
              key={key}
              className={`relative m-0 ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, rotate: index % 2 ? 2 : -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              whileHover={reduce ? undefined : { y: -6, rotate: index % 2 ? 1 : -1 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={reduce ? { duration: 0.1 } : { ...spring, delay: (index % 4) * 0.06 }}
            >
              <Component
                brand={brand}
                palette={palette}
                className={`@container ${index === 0 ? 'aspect-square' : 'aspect-[4/5]'}`}
              />
              <figcaption className="absolute bottom-2 left-2 -rotate-2 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium shadow-sm">
                {label}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const rise = useRise();
  const [loading, setLoading] = useState(false);
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center">
      <motion.h2
        {...rise}
        className="m-0 font-display text-[clamp(40px,9vw,112px)] font-extrabold leading-[0.88] tracking-[-0.04em]"
      >
        À vous de jouer.
      </motion.h2>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          setLoading(true);
          setTimeout(() => navigate('/start'), 400);
        }}
        className="mx-auto mt-8 flex h-14 items-center gap-2 rounded-full bg-accent px-8 text-base font-semibold text-on-accent"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <ImageUp className="h-5 w-5" aria-hidden />
        )}
        Créer ma charte
      </motion.button>
      <p className="mt-3 text-sm text-ink-3">Sans compte pour essayer · votre logo reste privé</p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="overflow-hidden bg-[oklch(0.16_0.01_60)] pt-12 text-[oklch(0.9_0.008_85)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 text-sm sm:grid-cols-3">
        <p className="m-0 max-w-xs opacity-70">
          Charta, générateur de chartes graphiques. Prototype de travail, données de démonstration.
        </p>
        <ul className="m-0 list-none space-y-2 p-0 opacity-80">
          <li>
            <a href="#fonctionnement">Fonctionnement</a>
          </li>
          <li>
            <a href="#charte">La charte</a>
          </li>
          <li>
            <a href="#mockups">Mockups</a>
          </li>
        </ul>
        <ul className="m-0 list-none space-y-2 p-0 opacity-80">
          <li>Conditions</li>
          <li>Confidentialité</li>
          <li>Mentions légales</li>
        </ul>
      </div>
      {/* Decorative wordmark as SVG text: out of the reading order and of text-contrast audits. */}
      <svg
        aria-hidden
        className="mt-10 block w-full"
        viewBox="0 0 1000 250"
        preserveAspectRatio="xMidYMax meet"
      >
        <text
          x="500"
          y="235"
          textAnchor="middle"
          fontSize="300"
          fontWeight="800"
          letterSpacing="-18"
          className="fill-[oklch(0.26_0.01_60)] font-display"
        >
          Charta
        </text>
      </svg>
    </footer>
  );
}
