import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import {
  ArrowRight,
  ArrowUp,
  Braces,
  Check,
  Dribbble,
  Github,
  Globe,
  ImageUp,
  Instagram,
  Linkedin,
  Loader2,
  Play,
  Plus,
  Ruler,
  Shirt,
  Type,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BOARDS } from '../boards/Boards';
import { Counter, Float, Magnetic, Reveal, SplitWords, Tilt } from '../components/fx';
import { BRANDS, WALL, svgUrl, type Brand } from '../lib/brand';
import { contrastRatio, inkOn, levelInfo } from '../lib/color';
import { reveal, softSpring, spring } from '../lib/motion';
import { MotionToggle, useReduce } from '../lib/motion-pref';
import { paletteOf } from '../lib/palette';
import { SCENES, SCENE_LABEL, hasPhotos, photoOf } from '../lib/photos';
import { MOCKUPS } from '../mockups/Mockups';
import { navigate, useMediaQuery } from '../router';

const Cover = BOARDS[0]!.Component;
const WORDS = ['charte', 'palette', 'typo', 'identité'];
const B0 = BRANDS[0]!;
// Soft, large surfaces everywhere (owner's review): one radius scale for cards.
const CARD = 'rounded-[36px]';

export function Landing() {
  return (
    <div className="theme-paper min-h-dvh overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <LogoWall />
        <Metrics />
        <Manifesto />
        <FlowGraph />
        <Journey />
        <Hanging />
        <Inside />
        <MockupShowcase />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

/** Floating "back to top", shown once the hero is passed; its ring is the reading progress. */
function BackToTop() {
  const reduce = useReduce();
  const { scrollY, scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useEffect(() => scrollY.on('change', (y) => setShown(y > window.innerHeight * 0.9)), [scrollY]);
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <AnimatePresence>
      {shown && (
        <motion.button
          type="button"
          aria-label="Revenir en haut de la page"
          onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={softSpring}
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-[0_18px_40px_-16px_rgb(0_0_0/0.5)]"
          style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <svg
            aria-hidden
            viewBox="0 0 56 56"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="3"
            />
            <motion.circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp className="h-5 w-5" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Nav() {
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  useEffect(() => scrollY.on('change', (y) => setCompact(y > 40)), [scrollY]);
  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4">
      <motion.nav
        aria-label="Navigation principale"
        className={`glass mx-auto flex h-16 max-w-[1200px] items-center gap-4 rounded-full border px-3 pl-6 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500 ${compact ? 'border-line bg-surface/80 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.45)]' : 'border-transparent bg-transparent'}`}
      >
        <a href="#/" className="font-display text-2xl font-extrabold tracking-tight">
          Charta
        </a>
        <div className="hidden flex-1 items-center gap-6 text-sm text-ink-2 md:flex">
          {[
            ['#fonctionnement', 'Fonctionnement'],
            ['#charte', 'La charte'],
            ['#mockups', 'Mockups'],
            ['#faq', 'Questions'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="group relative flex h-11 items-center hover:text-ink"
            >
              {label}
              <span className="absolute inset-x-0 bottom-2.5 h-px origin-left scale-x-0 bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </a>
          ))}
        </div>
        <MotionToggle className="ml-auto text-ink-2 hover:bg-elevated md:ml-0" />
        <Magnetic>
          <a
            href="#/start"
            className="flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent"
          >
            Essayer <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </Magnetic>
      </motion.nav>
    </header>
  );
}

function WordPill() {
  const reduce = useReduce();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(timer);
  }, [reduce]);
  const bg = BRANDS[index % BRANDS.length]!.roles.primary.hex;
  return (
    <motion.span
      layout
      transition={softSpring}
      className="relative mx-[0.08em] inline-flex -rotate-2 overflow-hidden rounded-[0.4em] px-[0.24em] align-baseline"
      animate={{ backgroundColor: bg, color: inkOn(bg) }}
      style={{ background: bg, color: inkOn(bg) }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ ...reveal, duration: 0.7 }}
          className="inline-block"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** Floating fragments of a real charter around the title. */
function HeroChips() {
  const palette = paletteOf(B0);
  const ratio = contrastRatio(palette.light, palette.primary);
  const chip =
    'absolute flex items-center gap-2 rounded-[22px] border border-line bg-surface/90 px-4 py-2.5 text-xs shadow-[0_24px_50px_-28px_rgb(0_0_0/0.45)]';
  return (
    <div aria-hidden data-decorative className="pointer-events-none absolute inset-0">
      <Float
        className={`${chip} left-[6%] top-[18%] hidden sm:flex`}
        style={{ ['--r' as string]: '-6deg' }}
        delay={0}
        duration={8}
      >
        {[palette.primary, palette.accent, palette.light, palette.dark].map((hex) => (
          <span
            key={hex}
            className="h-5 w-5 rounded-full border border-black/10"
            style={{ background: hex }}
          />
        ))}
      </Float>
      <Float
        className={`${chip} right-[8%] top-[14%] hidden font-mono sm:flex`}
        style={{ ['--r' as string]: '5deg' }}
        delay={2}
        duration={9}
      >
        <Check className="h-3.5 w-3.5 text-success" /> {ratio.toFixed(1)}:1 ·{' '}
        {levelInfo(ratio).label}
      </Float>
      <Float
        className={`${chip} bottom-[30%] left-[4%] hidden sm:flex`}
        style={{ ['--r' as string]: '4deg' }}
        delay={1}
        duration={10}
      >
        <span className="font-display text-2xl leading-none">Aa</span> Space Grotesk
      </Float>
      <Float
        className={`${chip} bottom-[34%] right-[5%] hidden sm:flex`}
        style={{ ['--r' as string]: '-4deg' }}
        delay={3}
        duration={8.5}
      >
        <img src={svgUrl(B0.favicon)} alt="" className="h-8 w-8 rounded-xl" /> favicon.svg
      </Float>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-6 pt-8 sm:pt-14">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-[420px] max-w-3xl"
      >
        <div
          // Radial gradients, not blur filters: a blurred layer is re-rasterised far more often.
          className="float absolute left-[4%] top-[-10%] h-96 w-96 rounded-full opacity-50"
          style={{
            background: `radial-gradient(closest-side, ${B0.roles.accent.hex}, transparent)`,
            animationDuration: '14s',
          }}
        />
        <div
          className="float absolute right-[2%] top-0 h-[26rem] w-[26rem] rounded-full opacity-35"
          style={{
            background: `radial-gradient(closest-side, ${BRANDS[1]!.roles.primary.hex}, transparent)`,
            animationDuration: '17s',
            animationDelay: '-4s',
          }}
        />
      </motion.div>
      <HeroChips />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reveal}
        className="relative mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink-2"
      >
        <span className="pulse-dot h-2 w-2 rounded-full bg-success" aria-hidden /> Prototype ·
        palettes calculées par le vrai moteur
      </motion.p>
      <h1 className="relative m-0 text-center font-display text-[clamp(44px,12vw,128px)] font-extrabold leading-[0.88] tracking-[-0.04em]">
        <SplitWords text="Votre logo," />
        <br />
        <SplitWords text="votre" delay={0.12} /> <WordPill />
        <br />
        <SplitWords text="en direct." delay={0.24} />
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...reveal, delay: 0.45 }}
        className="relative mx-auto mt-6 max-w-xl text-center text-[17px] leading-relaxed text-ink-2"
      >
        Déposez un logo. Palette, contrastes, variantes, typographie, règles et mockups se
        construisent sous vos yeux, puis se modifient d'un mot.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...reveal, delay: 0.55 }}
        className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Magnetic className="w-full sm:w-auto">
          <a
            href="#/start"
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent px-8 text-base font-semibold text-on-accent sm:w-auto"
          >
            <ImageUp
              className="h-5 w-5 transition-transform duration-500 group-hover:-translate-y-0.5"
              aria-hidden
            />{' '}
            Déposer mon logo
          </a>
        </Magnetic>
        <Magnetic className="w-full sm:w-auto">
          <a
            href={`#/studio/${B0.slug}`}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-8 text-base font-medium sm:w-auto"
          >
            <Play className="h-4 w-4" aria-hidden /> Voir le studio en action
          </a>
        </Magnetic>
      </motion.div>
      <Fan />
    </section>
  );
}

function FanCard({
  brand,
  offset,
  spread,
  index,
}: {
  brand: Brand;
  offset: number;
  spread: MotionValue<number>;
  index: number;
}) {
  const reduce = useReduce();
  const x = useTransform(spread, (s) => `calc(-50% + ${String(offset * 44 * s)}%)`);
  const rotate = useTransform(spread, (s) => offset * 8 * s);
  const y = useTransform(spread, (s) => Math.abs(offset) * 22 * s);
  return (
    <motion.div
      className="absolute bottom-0 left-1/2 w-[min(44vw,300px)] origin-bottom"
      style={{ x, rotate, y, zIndex: 10 - Math.abs(offset) }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 180, scale: 0.85 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={
          reduce ? { duration: 0.1 } : { ...softSpring, delay: 0.5 + Math.abs(offset) * 0.12 }
        }
        whileHover={reduce ? undefined : { y: -34, scale: 1.04, transition: softSpring }}
      >
        <Float delay={index * 1.3} duration={8}>
          <div className="overflow-hidden rounded-[22px] shadow-[0_40px_70px_-40px_rgb(0_0_0/0.6)]">
            <Cover brand={brand} palette={paletteOf(brand)} progress={1} />
          </div>
        </Float>
      </motion.div>
    </motion.div>
  );
}

/** Charters fanning out from a stack; scrolling opens the fan wider (card-fan reference). */
function Fan() {
  const reduce = useReduce();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const spread = useSpring(useTransform(scrollYProgress, [0.1, 0.6], [0.55, 1.12]), {
    stiffness: 70,
    damping: 20,
  });
  const fixed = useMotionValue(1);
  const brands = BRANDS.slice(0, 5);
  const mid = (brands.length - 1) / 2;
  return (
    <div
      ref={ref}
      aria-hidden
      data-decorative
      className="relative mx-auto mt-16 h-[min(96vw,560px)] max-w-5xl"
    >
      {brands.map((brand, index) => (
        <FanCard
          key={brand.slug}
          brand={brand}
          offset={index - mid}
          spread={reduce ? fixed : spread}
          index={index}
        />
      ))}
    </div>
  );
}

function LogoWall() {
  const half = Math.ceil(WALL.length / 2);
  const rows = [WALL.slice(0, half), WALL.slice(half)];
  return (
    <section className="py-12" aria-label="Logos de la bibliothèque de test">
      <p className="mb-6 text-center text-sm text-ink-3">
        Éprouvé sur une bibliothèque de logos réels, de toutes formes
      </p>
      <div className="space-y-5 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        {rows.map((row, r) => (
          <div
            key={r}
            className="marquee flex w-max gap-5"
            style={{
              animationDirection: r ? 'reverse' : 'normal',
              animationDuration: r ? '80s' : '65s',
            }}
          >
            {[...row, ...row].map((logo, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -8, rotate: index % 2 ? 4 : -4, scale: 1.08 }}
                transition={softSpring}
                className={`grid h-20 w-20 shrink-0 place-items-center rounded-[26px] border border-line p-4 sm:h-24 sm:w-24 ${logo.dark ? 'bg-[oklch(0.22_0.01_60)]' : 'bg-surface'}`}
              >
                <img
                  src={svgUrl(logo.svg)}
                  alt={index < row.length ? logo.name : ''}
                  className="h-full w-full object-contain"
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({
  index,
  to,
  suffix,
  label,
}: {
  index: number;
  to: number;
  suffix: string;
  label: string;
}) {
  return (
    <Reveal delay={index * 0.08} className="bg-surface p-7 sm:p-8">
      <Counter
        to={to}
        suffix={suffix}
        className="block font-display text-[clamp(48px,8vw,84px)] font-extrabold leading-none tracking-tight"
      />
      <p className="m-0 mt-3 text-sm text-ink-2">{label}</p>
    </Reveal>
  );
}

function Metrics() {
  const items = [
    { to: 7, suffix: '', label: 'pages de charte générées' },
    { to: 4, suffix: '', label: 'étapes suivies en direct' },
    { to: 6, suffix: '', label: 'variantes et déclinaisons du logo' },
    { to: 30, suffix: ' s', label: "objectif pour l'analyse complète" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4">
      <div
        className={`grid grid-cols-2 gap-px overflow-hidden border border-line bg-line md:grid-cols-4 ${CARD}`}
      >
        {items.map((item, index) => (
          <Metric key={item.label} index={index} {...item} />
        ))}
      </div>
    </section>
  );
}

const STICKERS = [
  { text: 'WCAG 2.2', rotate: -12, x: '4%', y: '6%' },
  { text: 'SVG vectoriel', rotate: 8, x: '68%', y: '2%' },
  { text: 'Annulable', rotate: -6, x: '76%', y: '74%' },
  { text: 'Design tokens', rotate: 10, x: '2%', y: '76%' },
  { text: 'CMJN indicatif', rotate: -4, x: '40%', y: '88%' },
];

function Manifesto() {
  const reduce = useReduce();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-28 sm:py-36">
      <h2 className="relative z-10 m-0 text-center font-display text-[clamp(40px,9vw,104px)] font-extrabold leading-[0.9] tracking-[-0.04em]">
        <SplitWords text="Une charte," />
        <br />
        <SplitWords text="pas un moodboard." delay={0.15} />
      </h2>
      <p className="relative z-10 mx-auto mt-6 max-w-lg text-center text-ink-2">
        Des règles mesurées : ratios de contraste calculés, variantes vérifiées, zone de protection,
        interdits illustrés avec votre propre logo.
      </p>
      <div aria-hidden data-decorative className="pointer-events-none absolute inset-0">
        {STICKERS.map((sticker, index) => {
          const brand = BRANDS[index % BRANDS.length]!;
          const bg = index % 2 ? brand.roles.accent.hex : brand.roles.primary.hex;
          return (
            <motion.span
              key={sticker.text}
              className="absolute"
              style={{ left: sticker.x, top: sticker.y }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -90, rotate: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, y: 0, rotate: sticker.rotate, scale: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 170, damping: 14, delay: index * 0.12 }
              }
            >
              <Float delay={index} duration={6 + index}>
                <span
                  className="block whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-bold shadow-[0_16px_30px_-14px_rgb(0_0_0/0.45)] sm:px-5 sm:py-2.5 sm:text-xl"
                  style={{ background: bg, color: inkOn(bg) }}
                >
                  {sticker.text}
                </span>
              </Float>
            </motion.span>
          );
        })}
      </div>
    </section>
  );
}

/** One logo, a whole system: nodes linked by flowing curves (node-graph reference). */
function FlowGraph() {
  const reduce = useReduce();
  const brand = BRANDS[1]!;
  const palette = paletteOf(brand);
  const nodes: { x: number; y: number; title: string; body: ReactNode }[] = [
    {
      x: 22,
      y: 16,
      title: 'Palette',
      body: (
        <div className="flex gap-1.5">
          {[palette.primary, palette.accent, palette.light, palette.dark].map((h) => (
            <span
              key={h}
              className="h-6 w-6 rounded-lg border border-black/10"
              style={{ background: h }}
            />
          ))}
        </div>
      ),
    },
    {
      x: 78,
      y: 14,
      title: 'Typographie',
      body: (
        <span className="flex items-center gap-1.5">
          <Type className="h-4 w-4" />{' '}
          <span className="font-display text-2xl leading-none">Aa</span>
        </span>
      ),
    },
    {
      x: 20,
      y: 70,
      title: 'Contrastes',
      body: (
        <span className="font-mono text-sm">
          {contrastRatio(palette.light, palette.primary).toFixed(1)}:1{' '}
          <Check className="inline h-3.5 w-3.5 text-success" />
        </span>
      ),
    },
    { x: 82, y: 68, title: 'Mockups', body: <Shirt className="h-6 w-6" /> },
    { x: 30, y: 92, title: 'Règles', body: <Ruler className="h-6 w-6" /> },
    { x: 70, y: 92, title: 'Tokens', body: <Braces className="h-6 w-6" /> },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="m-0 text-center font-display text-[clamp(32px,6vw,72px)] font-extrabold leading-[0.95] tracking-[-0.03em]">
        <SplitWords text="Un logo, tout un système." />
      </h2>
      <div className="relative mx-auto mt-12 aspect-[4/5] max-w-5xl sm:aspect-[16/10]">
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {nodes.map((node, index) => {
            const d = `M50 50 C ${String(50 + (node.x - 50) * 0.2)} ${String(node.y)}, ${String(node.x + (50 - node.x) * 0.4)} ${String(node.y)}, ${String(node.x)} ${String(node.y)}`;
            return (
              <g key={node.title}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeOpacity={0.3}
                  strokeWidth={0.4}
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: reduce ? 1 : 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={index % 2 ? palette.accent : palette.primary}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="flow-dash"
                  style={{ animationDelay: `${String(-index * 0.3)}s` }}
                />
              </g>
            );
          })}
        </svg>
        <motion.div
          className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[40px] border border-line bg-surface shadow-[0_40px_80px_-40px_rgb(0_0_0/0.5)] sm:h-44 sm:w-44"
          initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={softSpring}
        >
          <span
            className="pulse-dot absolute inset-0 rounded-[40px] border-2"
            style={{ borderColor: palette.primary, animationDuration: '3s' }}
            aria-hidden
          />
          <img
            src={svgUrl(brand.logo)}
            alt={`Logo ${brand.name}`}
            className="h-3/5 w-3/5 object-contain"
          />
        </motion.div>
        {nodes.map((node, index) => (
          <motion.div
            key={node.title}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${String(node.x)}%`, top: `${String(node.y)}%` }}
            initial={{ scale: reduce ? 1 : 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...softSpring, delay: 0.6 + index * 0.1 }}
          >
            <Float delay={index} duration={7 + (index % 3)}>
              <div className="flex flex-col items-start gap-1.5 rounded-[20px] border border-line bg-surface px-3 py-2 shadow-[0_20px_40px_-26px_rgb(0_0_0/0.45)] sm:gap-2 sm:rounded-[24px] sm:px-4 sm:py-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
                  {node.title}
                </span>
                {node.body}
              </div>
            </Float>
          </motion.div>
        ))}
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

function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });
  const [step, setStep] = useState(0);
  useEffect(
    () => scrollYProgress.on('change', (value) => setStep(Math.min(2, Math.floor(value * 3)))),
    [scrollYProgress],
  );
  const bar = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  return (
    <section
      id="fonctionnement"
      className="relative mx-2 overflow-hidden rounded-[44px] bg-[oklch(0.2_0.01_60)] py-20 text-[oklch(0.97_0.008_85)] sm:mx-4 sm:py-28"
    >
      <motion.div
        aria-hidden
        className="absolute left-0 top-0 h-1.5 w-full origin-left bg-[oklch(0.74_0.17_150)]"
        style={{ scaleX: bar }}
      />
      <div ref={ref} className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div className="space-y-[30vh] md:space-y-[40vh] md:py-[20vh]">
          {JOURNEY.map((item, index) => (
            <JourneyStep key={item.title} index={index} active={step === index} {...item} />
          ))}
        </div>
        <div className="sticky top-24 hidden h-[72vh] items-center md:flex">
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
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <motion.div
      animate={{ opacity: active || !wide ? 1 : 0.65, x: active && wide ? 14 : 0 }}
      transition={softSpring}
    >
      <span className="font-mono text-sm">0{index + 1}</span>
      <h3 className="m-0 mt-2 font-display text-[clamp(44px,7vw,84px)] font-extrabold leading-none tracking-tight">
        <SplitWords text={title} />
      </h3>
      <p className="mt-4 max-w-sm text-lg leading-relaxed">{text}</p>
      <div className="mt-8 md:hidden">
        <JourneyVisual step={index} />
      </div>
    </motion.div>
  );
}

function JourneyVisual({ step, progress }: { step: number; progress?: MotionValue<number> }) {
  const palette = paletteOf(B0);
  const fallback = useMotionValue(1);
  const rotate = useTransform(progress ?? fallback, [0, 1], [-3, 3]);
  return (
    <motion.div
      aria-hidden
      data-decorative
      style={{ rotate }}
      className="relative aspect-square w-full max-w-lg overflow-hidden rounded-[40px] bg-[oklch(0.27_0.01_60)] p-7"
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reveal}
            className="grid h-full place-items-center rounded-[30px] border-2 border-dashed border-white/25"
          >
            <motion.img
              src={svgUrl(B0.logo)}
              alt=""
              className="h-32 w-32 rounded-[30px] bg-white p-5"
              initial={{ y: -170, rotate: -18 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 13 }}
            />
            <motion.span
              className="flex items-center gap-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Check className="h-4 w-4 text-[oklch(0.74_0.17_150)]" /> Fichier vérifié
            </motion.span>
          </motion.div>
        )}
        {step === 1 && (
          <motion.ol
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reveal}
            className="m-0 flex h-full list-none flex-col justify-center gap-3 p-0"
          >
            {['Lecture du logo', 'Palette et contrastes', 'Typographie', 'Assemblage'].map(
              (label, index) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...reveal, delay: index * 0.25 }}
                  className="flex items-center gap-3 rounded-[22px] bg-white/8 p-4"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...softSpring, delay: index * 0.25 + 0.3 }}
                    className="grid h-8 w-8 place-items-center rounded-full bg-[oklch(0.74_0.17_150)] text-[oklch(0.2_0.01_60)]"
                  >
                    <Check className="h-4 w-4" />
                  </motion.span>
                  {label}
                  {index === 1 && (
                    <span className="ml-auto flex gap-1">
                      {Object.values(palette).map((hex, k) => (
                        <motion.span
                          key={hex}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...softSpring, delay: 0.7 + k * 0.08 }}
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
                  className="absolute left-1/2 top-1/2 w-[48%] overflow-hidden rounded-[18px]"
                  initial={{ x: '-50%', y: '-40%', rotate: 0, opacity: 0 }}
                  animate={{
                    x: `${String(-50 + (index - 1) * 42)}%`,
                    y: '-50%',
                    rotate: (index - 1) * 7,
                    opacity: 1,
                  }}
                  transition={{ ...softSpring, delay: index * 0.12 }}
                >
                  <Board brand={B0} palette={palette} progress={1} />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Charter pages pinned on a string, swaying; drag one and it springs back (polaroid-string reference). */
function Hanging() {
  const reduce = useReduce();
  const items = BRANDS.slice(0, 5).map((brand, index) => ({
    brand,
    board: BOARDS[[0, 2, 4, 1, 5][index]!]!,
  }));
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="m-0 font-display text-[clamp(36px,7vw,84px)] font-extrabold leading-[0.92] tracking-[-0.03em]">
          <SplitWords text="Des chartes qui ont du caractère." />
        </h2>
        <p className="mt-4 max-w-md text-ink-2">
          Chaque page est générée à partir du logo. Attrapez-en une.
        </p>
      </div>
      <div aria-hidden data-decorative className="relative mt-10 h-[min(140vw,640px)]">
        <svg
          className="absolute inset-x-0 top-6 h-24 w-full"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
        >
          <path
            d="M-10 20 Q 500 110 1010 20"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="no-scrollbar absolute inset-0 flex justify-start gap-7 overflow-x-auto px-6 pt-10 sm:justify-center">
          {items.map(({ brand, board }, index) => {
            const sag = [14, 46, 58, 46, 14][index] ?? 30;
            return (
              <motion.div
                key={brand.slug}
                className="relative w-[min(62vw,260px)] shrink-0"
                style={{ marginTop: sag }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -140 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={
                  reduce
                    ? { duration: 0.1 }
                    : { type: 'spring', stiffness: 90, damping: 12, delay: index * 0.14 }
                }
              >
                <div
                  className="swing"
                  style={{
                    ['--a' as string]: `${String(index % 2 ? -2.5 : 2.5)}deg`,
                    animationDelay: `${String(-index * 0.9)}s`,
                    animationDuration: '5.5s',
                  }}
                >
                  <motion.div
                    drag
                    dragSnapToOrigin
                    dragElastic={0.5}
                    dragTransition={{ bounceStiffness: 180, bounceDamping: 14 }}
                    whileDrag={{ scale: 1.05, rotate: index % 2 ? 6 : -6 }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <span className="absolute -top-3 left-1/2 z-10 h-8 w-5 -translate-x-1/2 rounded-md bg-[oklch(0.62_0.02_80)] shadow" />
                    <div className="rounded-[24px] bg-white p-2.5 pb-10 shadow-[0_34px_60px_-30px_rgb(0_0_0/0.55)]">
                      <div className="overflow-hidden rounded-[16px]">
                        <board.Component brand={brand} palette={paletteOf(brand)} progress={1} />
                      </div>
                      <span className="absolute bottom-3 left-4 font-display text-base text-[#333]">
                        {brand.name}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BrandChips({
  value,
  onChange,
  group,
}: {
  value: string;
  onChange: (slug: string) => void;
  group: string;
}) {
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
            className={`relative flex h-12 shrink-0 items-center gap-2 rounded-full border px-5 text-sm ${on ? 'border-transparent' : 'border-line'}`}
          >
            {on && (
              <motion.span
                layoutId={`brand-chip-${group}`}
                className="absolute inset-0 rounded-full bg-accent"
                transition={softSpring}
              />
            )}
            <img
              src={svgUrl(brand.logo)}
              alt=""
              className="relative h-6 w-6 rounded-md bg-white object-contain p-0.5"
            />
            <span className={`relative ${on ? 'text-on-accent' : ''}`}>{brand.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function Inside() {
  const [slug, setSlug] = useState(B0.slug);
  const brand = BRANDS.find((b) => b.slug === slug) ?? B0;
  const palette = paletteOf(brand);
  const swatches = [palette.primary, palette.accent, palette.light, palette.dark];
  return (
    <section id="charte" className="mx-auto max-w-6xl px-4 py-24">
      <h2 className="m-0 max-w-3xl font-display text-[clamp(36px,7vw,84px)] font-extrabold leading-[0.92] tracking-[-0.03em]">
        <SplitWords text="Tout ce que contient la charte." />
      </h2>
      <div className="mt-8">
        <BrandChips group="inside" value={slug} onChange={setSlug} />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3 md:grid-rows-[auto_auto]">
        <Tile
          className="md:col-span-2 md:row-span-2"
          title="Palette extraite du logo"
          note="Rôles attribués par le moteur : principale, accent, neutres."
        >
          <div className="grid h-full min-h-[340px] grid-cols-4 gap-3">
            {swatches.map((hex, index) => (
              <motion.div
                key={index}
                layout
                className={`flex flex-col justify-end rounded-[26px] p-4 ${index === 0 ? 'col-span-4 min-h-[200px] sm:col-span-2 sm:row-span-2' : 'col-span-2 min-h-[100px] sm:col-span-1'}`}
                animate={{ backgroundColor: hex, color: inkOn(hex) }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
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
          <ul className="m-0 list-none space-y-2.5 p-0">
            {[
              [palette.dark, palette.light],
              [palette.light, palette.primary],
              [palette.primary, palette.light],
            ].map(([text, bg]) => {
              const ratio = contrastRatio(text!, bg!);
              return (
                <li
                  key={`${text}${bg}`}
                  className="flex items-center justify-between rounded-[18px] px-4 py-3"
                  style={{ background: bg, color: text }}
                >
                  <span className="font-display text-lg font-bold">Aa</span>
                  <span className="font-mono text-sm tabular">
                    {ratio.toFixed(2)} · {levelInfo(ratio).label}
                  </span>
                </li>
              );
            })}
          </ul>
        </Tile>
        <Tile title="Variantes" note="Couleur, noir, blanc : vectorielles.">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              ['#FFFFFF', brand.logo],
              [palette.light, brand.mono.black],
              [palette.dark, brand.mono.white],
            ].map(([bg, svg], index) => (
              <div
                key={index}
                className="grid aspect-square place-items-center rounded-[20px] border border-line"
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
  return (
    <Reveal className={className}>
      <Tilt
        max={5}
        className={`flex h-full flex-col gap-5 border border-line bg-surface p-6 sm:p-7 ${CARD}`}
      >
        <div>
          <h3 className="m-0 text-xl font-semibold">{title}</h3>
          <p className="m-0 mt-1 text-sm text-ink-3">{note}</p>
        </div>
        <div className="flex-1">{children}</div>
      </Tilt>
    </Reveal>
  );
}

function MockupShowcase() {
  const reduce = useReduce();
  const [slug, setSlug] = useState(BRANDS[1]!.slug);
  const brand: Brand = BRANDS.find((b) => b.slug === slug) ?? B0;
  const palette = paletteOf(brand);
  const photos = hasPhotos(brand.slug);
  return (
    <section id="mockups" className="mx-2 rounded-[44px] bg-elevated py-24 sm:mx-4">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="m-0 font-display text-[clamp(36px,7vw,84px)] font-extrabold leading-[0.92] tracking-[-0.03em]">
          <SplitWords text="Votre marque," />{' '}
          <span className="inline-block -rotate-2 rounded-[0.4em] bg-accent px-[0.22em] text-on-accent">
            en situation
          </span>
          .
        </h2>
        <p className="mt-4 max-w-lg text-ink-2">
          Choisissez une marque : tous les supports changent en même temps.
          {photos ? ' Photographies générées à partir du vrai logo.' : ''}
        </p>
        <div className="mt-6">
          <BrandChips group="mockups" value={slug} onChange={setSlug} />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos
            ? SCENES.map((scene, index) => {
                const url = photoOf(brand.slug, scene);
                return (
                  <motion.figure
                    key={`${brand.slug}-${scene}`}
                    className={`relative m-0 ${index === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={reduce ? { duration: 0.1 } : { ...softSpring, delay: index * 0.08 }}
                  >
                    <Tilt
                      max={5}
                      className="h-full overflow-hidden rounded-[36px] shadow-[0_40px_80px_-44px_rgb(0_0_0/0.6)]"
                    >
                      {url ? (
                        <motion.img
                          src={url}
                          alt={`${SCENE_LABEL[scene] ?? scene} ${brand.name}`}
                          className="block h-full min-h-[420px] w-full object-cover"
                          whileHover={reduce ? undefined : { scale: 1.05 }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        />
                      ) : (
                        <div className="skeleton aspect-[4/5]" />
                      )}
                    </Tilt>
                    <figcaption className="absolute bottom-4 left-4 -rotate-2 rounded-full bg-surface px-4 py-1.5 text-sm font-medium shadow-sm">
                      {SCENE_LABEL[scene]}
                    </figcaption>
                  </motion.figure>
                );
              })
            : MOCKUPS.map(({ key, label, Component }, index) => (
                <motion.figure
                  key={key}
                  className={`relative m-0 ${index === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}`}
                  initial={
                    reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: index % 2 ? 2 : -2 }
                  }
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={
                    reduce ? { duration: 0.1 } : { ...softSpring, delay: (index % 3) * 0.08 }
                  }
                >
                  <Tilt max={5} className="h-full overflow-hidden rounded-[36px]">
                    <Component
                      brand={brand}
                      palette={palette}
                      className={`@container h-full min-h-[320px] !rounded-[36px] ${index === 0 ? 'aspect-square' : 'aspect-[4/5]'}`}
                    />
                  </Tilt>
                  <figcaption className="absolute bottom-4 left-4 -rotate-2 rounded-full bg-surface/90 px-4 py-1.5 text-sm font-medium shadow-sm">
                    {label}
                  </figcaption>
                </motion.figure>
              ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  [
    'Quels fichiers puis-je déposer ?',
    'SVG, PNG, JPEG ou WebP, jusqu’à 10 Mo (5 Mo pour un SVG). Le fichier est vérifié et assaini avant toute lecture ; l’original reste privé.',
  ],
  [
    'Les couleurs viennent-elles vraiment de mon logo ?',
    'Oui : la palette est extraite des pixels du logo, puis chaque couleur reçoit un rôle (principale, accent, neutres). Les cas monochromes sont complétés et marqués « dérivés ».',
  ],
  [
    'Les contrastes sont-ils fiables ?',
    'Ils sont calculés selon WCAG 2.2 sur la valeur non arrondie, et chaque niveau est indiqué par une icône, un libellé et une couleur.',
  ],
  [
    'Puis-je tout modifier ?',
    'Couleurs, polices, textes, pages : chaque modification est une commande que vous pouvez annuler ou rétablir.',
  ],
  [
    'Que contient l’export ?',
    'La charte en PDF, un kit ZIP (logos SVG et PNG, variantes, favicon) et les design tokens en JSON et CSS.',
  ],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:grid-cols-[1fr_1.4fr]">
      <h2 className="m-0 font-display text-[clamp(36px,6vw,76px)] font-extrabold leading-[0.92] tracking-[-0.03em]">
        <SplitWords text="Vos questions." />
      </h2>
      <ul className="m-0 list-none space-y-3 p-0">
        {FAQ.map(([question, answer], index) => {
          const expanded = open === index;
          return (
            <motion.li
              key={question}
              layout
              transition={softSpring}
              className={`border border-line bg-surface px-6 ${'rounded-[28px]'}`}
            >
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium"
                >
                  {question}
                  <motion.span
                    animate={{ rotate: expanded ? 45 : 0 }}
                    transition={softSpring}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={reveal}
                    className="m-0 max-w-xl pb-6 text-ink-2"
                  >
                    {answer}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/** Closing call with an arc of real marks turning slowly behind it (glowing-arc reference). */
function FinalCta() {
  const [loading, setLoading] = useState(false);
  const ring = WALL.slice(0, 20);
  return (
    <section className="relative overflow-hidden px-4 py-32 text-center">
      <div
        aria-hidden
        data-decorative
        className="pointer-events-none absolute left-1/2 top-[84%] h-[960px] w-[960px] -translate-x-1/2 sm:top-[82%]"
      >
        <div className="spin-slow relative h-full w-full">
          {ring.map((logo, index) => {
            const angle = (index / ring.length) * Math.PI * 2;
            return (
              <div
                key={index}
                className={`absolute grid h-16 w-16 place-items-center rounded-[22px] border border-line p-3 shadow-sm ${logo.dark ? 'bg-[oklch(0.22_0.01_60)]' : 'bg-surface'}`}
                style={{
                  left: `${String(50 + Math.cos(angle) * 46)}%`,
                  top: `${String(50 + Math.sin(angle) * 46)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img src={svgUrl(logo.svg)} alt="" className="h-full w-full object-contain" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative">
        <h2 className="m-0 font-display text-[clamp(44px,10vw,124px)] font-extrabold leading-[0.88] tracking-[-0.04em]">
          <SplitWords text="À vous de jouer." />
        </h2>
        <Magnetic className="mt-8">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setTimeout(() => navigate('/start'), 400);
            }}
            className="flex h-16 items-center gap-2 rounded-full bg-accent px-10 text-base font-semibold text-on-accent"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <ImageUp className="h-5 w-5" aria-hidden />
            )}
            Créer ma charte
          </button>
        </Magnetic>
        <p className="mt-3 text-sm text-ink-3">Sans compte pour essayer · votre logo reste privé</p>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS: [string, string[]][] = [
  ['Produit', ['Studio', 'Exemples de chartes', 'Mockups', 'Exports']],
  ['Ressources', ['Guide de la charte', 'Accessibilité', 'Design tokens', 'Nouveautés']],
  ['Entreprise', ['À propos', 'Contact', 'Presse', 'Partenaires']],
  ['Légal', ['Conditions', 'Confidentialité', 'Mentions légales', 'Cookies']],
];

function Footer() {
  const reduce = useReduce();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const letters = 'Charta'.split('');
  return (
    <footer className="relative mx-2 mb-2 overflow-hidden rounded-[44px] bg-[oklch(0.16_0.01_60)] pt-16 text-[oklch(0.92_0.008_85)] sm:mx-4 sm:mb-4">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="m-0 font-display text-3xl font-extrabold tracking-tight">Charta</p>
            <p className="mt-3 max-w-xs text-sm text-[oklch(0.78_0.008_85)]">
              Le générateur de chartes graphiques qui se construisent sous vos yeux.
            </p>
            <form
              className="mt-6 flex max-w-sm items-center gap-2 rounded-full border border-white/15 bg-[oklch(0.23_0.01_60)] p-1.5 pl-5 transition-colors focus-within:border-white/40"
              onSubmit={(event) => {
                event.preventDefault();
                if (email.includes('@')) setJoined(true);
              }}
            >
              <label htmlFor="newsletter" className="sr-only">
                Votre e-mail
              </label>
              <input
                id="newsletter"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Recevoir les nouveautés"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[oklch(0.82_0.008_85)]"
              />
              <button
                type="submit"
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-[oklch(0.16_0.01_60)]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={joined ? 'ok' : 'go'}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    {joined ? <Check className="h-4 w-4" aria-hidden /> : null}
                    {joined ? 'Inscrit' : "S'inscrire"}
                  </motion.span>
                </AnimatePresence>
              </button>
            </form>
            <div className="mt-6 flex items-center gap-2">
              {[Github, Linkedin, Instagram, Dribbble].map((Icon, index) => (
                <motion.a
                  key={index}
                  href="#/"
                  aria-label={['GitHub', 'LinkedIn', 'Instagram', 'Dribbble'][index]}
                  whileHover={{ y: -3, rotate: index % 2 ? 6 : -6 }}
                  transition={softSpring}
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/15 hover:bg-white/10"
                >
                  <Icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map(([title, links]) => (
              <div key={title}>
                <p className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-[oklch(0.72_0.008_85)]">
                  {title}
                </p>
                <ul className="m-0 list-none space-y-1 p-0 text-sm">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#/"
                        className="group inline-flex h-8 items-center gap-1 text-[oklch(0.88_0.008_85)] hover:text-white"
                      >
                        {link}
                        <ArrowRight
                          className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                          aria-hidden
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6 text-xs text-[oklch(0.78_0.008_85)]">
          <span className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
            <span
              className="pulse-dot h-2 w-2 rounded-full bg-[oklch(0.74_0.17_150)]"
              aria-hidden
            />{' '}
            Prototype · tous les écrans en démo
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5">
            <Globe className="h-3.5 w-3.5" aria-hidden /> Français · English
          </span>
          <span className="flex-1">© 2026 Charta</span>
        </div>
      </div>
      <div aria-hidden data-decorative className="relative mt-8 select-none overflow-hidden">
        <div className="flex justify-center font-display text-[26vw] font-extrabold leading-[0.78] tracking-[-0.06em]">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              className="inline-block bg-gradient-to-b from-[oklch(0.44_0.01_60)] to-[oklch(0.2_0.01_60)] bg-clip-text text-transparent"
              initial={reduce ? { opacity: 0 } : { y: '60%', opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              whileHover={reduce ? undefined : { y: '-8%', transition: softSpring }}
              transition={
                reduce ? { duration: 0.1 } : { ...reveal, duration: 1, delay: index * 0.08 }
              }
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
    </footer>
  );
}
