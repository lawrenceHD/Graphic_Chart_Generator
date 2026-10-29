'use client';

import type { PageType } from '@app/contracts';
import { ArrowRight, ArrowUp, Check, ImageUp, ScanEye } from 'lucide-react';
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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { contrastRatio, inkOn } from '../brand/color';
import { COLOR_ROLES } from '../studio/workspace/brand-view';
import { Float, Magnetic, SplitWords } from '../ui/fx';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { DEMO_VIEW } from './demo';
import { DemoSheet } from './demo-sheet';

const EASE = [0.16, 1, 0.3, 1] as const;
const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const colors = DEMO_VIEW.colors;

export function Nav() {
  const t = useTranslations('landing.nav');
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  useEffect(
    () =>
      scrollY.on('change', (y) => {
        setCompact(y > 40);
      }),
    [scrollY],
  );
  const links = [
    ['#fonctionnement', t('how')],
    ['#charte', t('guideline')],
    ['#mockups', t('mockups')],
    ['#questions', t('faq')],
  ] as const;
  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4">
      <nav
        aria-label={t('label')}
        className={`glass mx-auto flex h-16 max-w-[1200px] items-center gap-3 rounded-full border px-2.5 pl-6 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-500 ${compact ? 'border-line bg-surface/80 shadow-[0_18px_40px_-28px_oklch(0.2_0.01_60/0.45)]' : 'border-transparent bg-transparent'}`}
      >
        <Link
          href="/"
          className="font-display text-2xl font-extrabold tracking-tight text-ink no-underline"
        >
          Charta
        </Link>
        <div className="ml-4 hidden flex-1 items-center gap-6 text-sm text-ink-2 md:flex">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="group relative flex h-11 items-center no-underline hover:text-ink"
            >
              {label}
              <span className="absolute inset-x-0 bottom-2.5 h-px origin-left scale-x-0 bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <LocaleSwitch className="hidden lg:flex" />
          <ThemeSwitch className="hidden sm:flex" />
          <Magnetic>
            <Link
              href="/start"
              className="flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent no-underline sm:px-6"
            >
              {t('try')} <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Magnetic>
        </div>
      </nav>
    </header>
  );
}

/** The changing word of the headline, on a pill coloured by the example brand. */
function WordPill({ words }: { readonly words: readonly string[] }) {
  const reduce = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % words.length);
    }, 2400);
    return () => {
      clearInterval(timer);
    };
  }, [reduce, words.length]);
  const tones = [colors.primary, colors.accent, colors.neutralDark, colors.primary];
  const bg = tones[index % tones.length] ?? colors.primary;
  // Screen readers hear the first word once; the rotation is visual. Both words share one grid cell while
  // they cross, so the pill is never empty.
  return (
    <>
      <span className="sr-only">{words[0]}</span>
      <motion.span
        aria-hidden="true"
        layout
        transition={SOFT}
        className="relative mx-[0.06em] inline-grid -rotate-2 overflow-hidden rounded-[0.32em] px-[0.22em] pb-[0.04em] align-baseline"
        initial={false}
        animate={{ backgroundColor: bg, color: inkOn(bg) }}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={words[index]}
            initial={{ y: '90%', opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: '-90%', opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="[grid-area:1/1] whitespace-nowrap"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}

/** Real values of the example, floating around the title. */
function HeroChips() {
  const t = useTranslations('landing.hero');
  const ratio = contrastRatio(colors.neutralDark, colors.primary);
  const chip =
    'absolute flex items-center gap-2 rounded-[20px] border border-line bg-surface/90 px-4 py-2.5 text-xs text-ink-2 shadow-[0_24px_50px_-28px_oklch(0.2_0.01_60/0.45)]';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      <Float className={`${chip} top-[16%] left-[3%]`} rotate={-6} duration={8}>
        {COLOR_ROLES.map((role) => (
          <span
            key={role}
            className="size-5 rounded-full border border-line"
            style={{ background: colors[role] }}
          />
        ))}
      </Float>
      <Float className={`${chip} top-[12%] right-[5%] font-mono`} rotate={5} delay={2} duration={9}>
        <Check className="size-3.5 text-success" /> {t('chipContrast', { ratio: ratio.toFixed(1) })}
      </Float>
      <Float className={`${chip} bottom-[30%] left-[1%]`} rotate={4} delay={1} duration={10}>
        <span
          className="text-2xl leading-none text-ink"
          style={{ fontFamily: DEMO_VIEW.pairing.display.css }}
        >
          Aa
        </span>
        {t('chipFont')}
      </Float>
      <Float className={`${chip} right-[2%] bottom-[34%]`} rotate={-4} delay={3} duration={8.5}>
        <img src={DEMO_VIEW.logo.color} alt="" className="h-7 w-12 object-contain" />
        {t('chipPages')}
      </Float>
    </div>
  );
}

const FAN: readonly Exclude<PageType, 'mockup'>[] = [
  'palette',
  'typography',
  'cover',
  'logo',
  'contrast',
];

function FanCard({
  type,
  offset,
  spread,
  index,
}: {
  readonly type: Exclude<PageType, 'mockup'>;
  readonly offset: number;
  readonly spread: MotionValue<number>;
  readonly index: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const x = useTransform(spread, (s) => `calc(-50% + ${String(offset * 46 * s)}%)`);
  const rotate = useTransform(spread, (s) => offset * 7 * s);
  const y = useTransform(spread, (s) => Math.abs(offset) * 26 * s);
  return (
    <motion.div
      className="absolute bottom-0 left-1/2 w-[min(58vw,440px)] origin-bottom"
      style={{ x, rotate, y, zIndex: 10 - Math.abs(offset) }}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 160, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.1 } : { ...SOFT, delay: 0.55 + Math.abs(offset) * 0.12 }}
        {...(reduce ? {} : { whileHover: { y: -30, scale: 1.04, transition: SOFT } })}
      >
        <Float delay={index * 1.3} duration={9}>
          <div className="overflow-hidden rounded-[14px] shadow-[0_40px_70px_-40px_oklch(0.2_0.01_60/0.6)]">
            <DemoSheet type={type} />
          </div>
        </Float>
      </motion.div>
    </motion.div>
  );
}

/** Pages of the example fanning out from a stack; scrolling opens the fan wider. */
function Fan() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const spread = useSpring(useTransform(scrollYProgress, [0.1, 0.6], [0.6, 1.1]), {
    stiffness: 70,
    damping: 20,
  });
  const fixed = useMotionValue(1);
  const mid = (FAN.length - 1) / 2;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative mx-auto mt-14 h-[min(70vw,440px)] max-w-5xl"
    >
      {FAN.map((type, index) => (
        <FanCard
          key={type}
          type={type}
          offset={index - mid}
          spread={reduce ? fixed : spread}
          index={index}
        />
      ))}
    </div>
  );
}

export function Hero() {
  const t = useTranslations('landing.hero');
  const words = t('words').split('|');
  return (
    <section className="relative mx-auto max-w-6xl overflow-x-clip px-4 pt-10 pb-6 sm:pt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-20 mx-auto h-[420px] max-w-3xl"
      >
        <div
          className="float absolute top-[-10%] left-[4%] size-96 rounded-full opacity-45"
          style={{
            background: `radial-gradient(closest-side, ${colors.primary}, transparent)`,
            animationDuration: '14s',
          }}
        />
        <div
          className="float absolute top-0 right-[2%] size-[26rem] rounded-full opacity-30"
          style={{
            background: `radial-gradient(closest-side, ${colors.accent}, transparent)`,
            animationDuration: '17s',
            animationDelay: '-4s',
          }}
        />
      </div>
      <HeroChips />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink-2"
      >
        <span className="pulse-dot size-2 rounded-full bg-success" aria-hidden="true" />
        {t('badge')}
      </motion.p>
      <h1 className="relative m-0 text-center font-display text-[clamp(44px,11vw,120px)] leading-[0.9] font-extrabold tracking-[-0.04em] text-balance">
        <SplitWords text={t('line1')} now />
        <br />
        <SplitWords text={t('line2')} delay={0.12} now /> <WordPill words={words} />
        <br />
        <SplitWords text={t('line3')} delay={0.24} now />
      </h1>
      <motion.p
        initial={{ opacity: 0, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        className="relative mx-auto mt-7 max-w-[60ch] text-center text-[17px] leading-relaxed text-pretty text-ink-2"
      >
        {t('lead')}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
        className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Magnetic className="w-full sm:w-auto">
          <Link
            href="/start"
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent px-8 text-base font-semibold text-on-accent no-underline sm:w-auto"
          >
            <ImageUp
              aria-hidden="true"
              className="size-5 transition-transform duration-500 group-hover:-translate-y-0.5"
            />
            {t('start')}
          </Link>
        </Magnetic>
        <Magnetic className="w-full sm:w-auto">
          <a
            href="#charte"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-8 text-base font-medium text-ink no-underline sm:w-auto"
          >
            <ScanEye aria-hidden="true" className="size-4" /> {t('example')}
          </a>
        </Magnetic>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="relative m-0 mt-4 text-center text-xs text-ink-3"
      >
        {t('reassure')}
      </motion.p>
      <Fan />
    </section>
  );
}

/** Floating "back to top" once the hero is passed; its ring is the reading progress. */
export function BackToTop() {
  const t = useTranslations('landing.footer');
  const reduce = useReducedMotion() ?? false;
  const { scrollY, scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useEffect(
    () =>
      scrollY.on('change', (y) => {
        setShown(y > window.innerHeight * 0.9);
      }),
    [scrollY],
  );
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <AnimatePresence>
      {shown ? (
        <motion.button
          type="button"
          aria-label={t('top')}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
          }}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={SOFT}
          className="fixed right-5 bottom-5 z-50 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-[0_18px_40px_-16px_oklch(0.2_0.01_60/0.5)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 56 56"
            className="absolute inset-0 size-full -rotate-90"
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
          <ArrowUp aria-hidden="true" className="size-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
