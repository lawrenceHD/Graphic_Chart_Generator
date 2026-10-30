'use client';

import type { PageType } from '@app/contracts';
import {
  ArrowRight,
  Braces,
  Check,
  ImageUp,
  Loader2,
  Plus,
  Ruler,
  Shirt,
  Type,
  X,
} from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { buildScale, contrastRatio, inkOn } from '../brand/color';
import { MockupStage, SCENES } from '../studio/mockups/mockup-stage';
import { COLOR_ROLES, type ColorRole } from '../studio/workspace/brand-view';
import { Counter, Float, Magnetic, Reveal, SplitWords, Tilt } from '../ui/fx';
import { LocaleSwitch, ThemeSwitch } from '../ui/preferences';
import { DEMO_VIEW } from './demo';
import { DemoSheet, demoTitle } from './demo-sheet';

const EASE = [0.16, 1, 0.3, 1] as const;
const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const colors = DEMO_VIEW.colors;
const SECTION_TITLE =
  'm-0 font-display text-[clamp(36px,7vw,84px)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance';
const CARD = 'rounded-[32px]';

export function Facts() {
  const t = useTranslations('landing.facts');
  const items = [
    { to: 10, label: t('pages') },
    { to: 4, label: t('steps') },
    { to: SCENES.length, label: t('scenes') },
    { to: 8, label: t('pairings') },
  ];
  return (
    <section aria-label={t('label')} className="mx-auto mt-24 max-w-6xl px-4">
      <dl
        className={`m-0 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line md:grid-cols-4 ${CARD}`}
      >
        {items.map((item, index) => (
          <Reveal
            key={item.label}
            delay={index * 0.08}
            className="flex flex-col-reverse bg-surface p-7 sm:p-8"
          >
            <dt className="mt-3 text-sm text-ink-2">{item.label}</dt>
            <dd className="m-0">
              <Counter
                to={item.to}
                className="block font-display text-[clamp(48px,8vw,84px)] leading-none font-extrabold tracking-tight"
              />
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}

const STICKER_SPOTS = [
  { rotate: -12, x: '3%', y: '14%' },
  { rotate: 8, x: '68%', y: '12%' },
  { rotate: -6, x: '74%', y: '76%' },
  { rotate: 10, x: '2%', y: '74%' },
  { rotate: -4, x: '38%', y: '90%' },
];

export function Manifesto() {
  const t = useTranslations('landing.manifesto');
  const reduce = useReducedMotion() ?? false;
  const stickers = t('stickers').split('|');
  const tones = [colors.primary, colors.accent, colors.neutralDark, colors.primary, colors.accent];
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-28 sm:py-36">
      <h2 className="relative z-10 m-0 text-center font-display text-[clamp(40px,9vw,104px)] leading-[0.9] font-extrabold tracking-[-0.04em]">
        <SplitWords text={t('line1')} />
        <br />
        <SplitWords text={t('line2')} delay={0.15} />
      </h2>
      <p className="relative z-10 mx-auto mt-6 max-w-[52ch] text-center text-pretty text-ink-2">
        {t('lead')}
      </p>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stickers.map((text, index) => {
          const spot = STICKER_SPOTS[index] ?? { rotate: 0, x: '50%', y: '50%' };
          const bg = tones[index] ?? colors.primary;
          return (
            <motion.span
              key={text}
              className="absolute"
              style={{ left: spot.x, top: spot.y }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -90, rotate: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, y: 0, rotate: spot.rotate, scale: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 170, damping: 14, delay: index * 0.12 }
              }
            >
              <Float delay={index} duration={6 + index}>
                <span
                  className="block rounded-full px-4 py-2 font-display text-sm font-bold whitespace-nowrap shadow-[0_16px_30px_-14px_oklch(0.2_0.01_60/0.45)] sm:px-5 sm:py-2.5 sm:text-xl"
                  style={{ background: bg, color: inkOn(bg) }}
                >
                  {text}
                </span>
              </Float>
            </motion.span>
          );
        })}
      </div>
    </section>
  );
}

export function SystemGraph() {
  const t = useTranslations('landing.system');
  const reduce = useReducedMotion() ?? false;
  const ratio = contrastRatio(colors.neutralDark, colors.primary);
  const nodes: readonly { x: number; y: number; title: string; body: ReactNode }[] = [
    {
      x: 20,
      y: 16,
      title: t('palette'),
      body: (
        <span className="flex gap-1.5">
          {COLOR_ROLES.map((role) => (
            <span
              key={role}
              className="size-6 rounded-lg border border-line"
              style={{ background: colors[role] }}
            />
          ))}
        </span>
      ),
    },
    {
      x: 80,
      y: 14,
      title: t('type'),
      body: (
        <span className="flex items-center gap-1.5">
          <Type aria-hidden="true" className="size-4" />
          <span
            className="text-2xl leading-none"
            style={{ fontFamily: DEMO_VIEW.pairing.display.css }}
          >
            Aa
          </span>
        </span>
      ),
    },
    {
      x: 18,
      y: 70,
      title: t('contrast'),
      body: (
        <span className="tabular font-mono text-sm">
          {ratio.toFixed(1)}:1 <Check aria-hidden="true" className="inline size-3.5 text-success" />
        </span>
      ),
    },
    { x: 82, y: 68, title: t('mockups'), body: <Shirt aria-hidden="true" className="size-6" /> },
    { x: 30, y: 92, title: t('rules'), body: <Ruler aria-hidden="true" className="size-6" /> },
    { x: 70, y: 92, title: t('tokens'), body: <Braces aria-hidden="true" className="size-6" /> },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="m-0 text-center font-display text-[clamp(32px,6vw,72px)] leading-[0.95] font-extrabold tracking-[-0.03em]">
        <SplitWords text={t('title')} />
      </h2>
      <p className="mx-auto mt-4 max-w-[52ch] text-center text-ink-2">{t('lead')}</p>
      <div className="relative mx-auto mt-12 aspect-[4/5] max-w-5xl sm:aspect-[16/10]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
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
                  transition={{ duration: 1.6, ease: EASE, delay: index * 0.12 }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={index % 2 === 1 ? colors.accent : colors.primary}
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
          className="absolute top-1/2 left-1/2 grid h-32 w-44 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[36px] border border-line bg-surface shadow-[0_40px_80px_-40px_oklch(0.2_0.01_60/0.5)] sm:h-44 sm:w-60"
          initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={SOFT}
        >
          <span
            aria-hidden="true"
            className="pulse-dot absolute inset-0 rounded-[36px] border-2"
            style={{ borderColor: colors.primary, animationDuration: '3s' }}
          />
          <img
            src={DEMO_VIEW.logo.color}
            alt={DEMO_VIEW.name}
            className="h-3/5 w-4/5 object-contain"
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
            transition={{ ...SOFT, delay: 0.6 + index * 0.1 }}
          >
            <Float delay={index} duration={7 + (index % 3)}>
              <div className="flex flex-col items-start gap-1.5 rounded-[20px] border border-line bg-surface px-3 py-2 text-ink shadow-[0_20px_40px_-26px_oklch(0.2_0.01_60/0.45)] sm:gap-2 sm:rounded-[24px] sm:px-4 sm:py-3">
                <span className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">
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

const DARK = 'oklch(0.2 0.01 60)';
const ON_DARK = 'oklch(0.97 0.008 85)';
const GREEN = 'oklch(0.74 0.17 150)';

export function Journey() {
  const t = useTranslations('landing.journey');
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });
  const [step, setStep] = useState(0);
  useEffect(
    () =>
      scrollYProgress.on('change', (value) => {
        setStep(Math.min(2, Math.max(0, Math.floor(value * 3))));
      }),
    [scrollYProgress],
  );
  const bar = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const items = [
    { title: t('dropTitle'), text: t('dropText') },
    { title: t('watchTitle'), text: t('watchText') },
    { title: t('editTitle'), text: t('editText') },
  ];
  return (
    <section
      id="fonctionnement"
      aria-label={t('label')}
      className="relative mx-2 scroll-mt-24 overflow-clip rounded-[40px] py-20 sm:mx-4 sm:py-28"
      style={{ background: DARK, color: ON_DARK }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 h-1.5 w-full origin-left"
        style={{ scaleX: bar, background: GREEN }}
      />
      <div ref={ref} className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <ol className="m-0 list-none space-y-[30vh] p-0 md:space-y-[40vh] md:py-[20vh]">
          {items.map((item, index) => (
            <motion.li
              key={item.title}
              animate={{ opacity: step === index ? 1 : 0.55, x: step === index ? 14 : 0 }}
              transition={SOFT}
            >
              <span className="tabular font-mono text-sm">0{index + 1}</span>
              <h3 className="m-0 mt-2 font-display text-[clamp(44px,7vw,84px)] leading-none font-extrabold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-4 max-w-sm text-lg leading-relaxed">{item.text}</p>
              <div className="mt-8 md:hidden">
                <JourneyVisual step={index} />
              </div>
            </motion.li>
          ))}
        </ol>
        <div className="sticky top-24 hidden h-[72vh] items-center md:flex">
          <JourneyVisual step={step} progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}

function JourneyVisual({
  step,
  progress,
}: {
  readonly step: number;
  readonly progress?: MotionValue<number>;
}) {
  const t = useTranslations('landing.journey');
  const fallback = useMotionValue(1);
  const rotate = useTransform(progress ?? fallback, [0, 1], [-3, 3]);
  const labels = t('steps').split('|');
  const fanned: readonly Exclude<PageType, 'mockup'>[] = ['palette', 'cover', 'typography'];
  return (
    <motion.div
      aria-hidden="true"
      style={{ rotate, background: 'oklch(0.27 0.01 60)' }}
      className="relative aspect-square w-full max-w-lg overflow-hidden rounded-[36px] p-7"
    >
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="grid h-full place-items-center rounded-[28px] border-2 border-dashed"
            style={{ borderColor: 'oklch(1 0 0 / 0.25)' }}
          >
            <motion.div
              className="grid h-32 w-48 place-items-center rounded-[28px] p-5"
              style={{ background: 'oklch(0.99 0.004 85)' }}
              initial={{ y: -170, rotate: -18 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 13 }}
            >
              <img src={DEMO_VIEW.logo.color} alt="" className="size-full object-contain" />
            </motion.div>
            <motion.span
              className="flex items-center gap-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Check className="size-4" style={{ color: GREEN }} /> {t('checked')}
            </motion.span>
          </motion.div>
        ) : step === 1 ? (
          <motion.ol
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="m-0 flex h-full list-none flex-col justify-center gap-3 p-0"
          >
            {labels.map((label, index) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: index * 0.25 }}
                className="flex items-center gap-3 rounded-[20px] p-4"
                style={{ background: 'oklch(1 0 0 / 0.08)' }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...SOFT, delay: index * 0.25 + 0.3 }}
                  className="grid size-8 place-items-center rounded-full"
                  style={{ background: GREEN, color: DARK }}
                >
                  <Check className="size-4" />
                </motion.span>
                {label}
                {index === 1 ? (
                  <span className="ml-auto flex gap-1">
                    {COLOR_ROLES.map((role, k) => (
                      <motion.span
                        key={role}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ ...SOFT, delay: 0.7 + k * 0.08 }}
                        className="size-5 rounded-full border"
                        style={{ background: colors[role], borderColor: 'oklch(1 0 0 / 0.2)' }}
                      />
                    ))}
                  </span>
                ) : null}
              </motion.li>
            ))}
          </motion.ol>
        ) : (
          <motion.div
            key="pages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            {fanned.map((type, index) => (
              <motion.div
                key={type}
                className="absolute top-1/2 left-1/2 w-[62%] overflow-hidden rounded-[10px] shadow-[0_30px_60px_-30px_oklch(0_0_0/0.7)]"
                initial={{ x: '-50%', y: '-40%', rotate: 0, opacity: 0 }}
                animate={{
                  x: `${String(-50 + (index - 1) * 28)}%`,
                  y: `${String(-50 + (index - 1) * 22)}%`,
                  rotate: (index - 1) * 7,
                  opacity: 1,
                }}
                transition={{ ...SOFT, delay: index * 0.12 }}
              >
                <DemoSheet type={type} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const HUNG: readonly Exclude<PageType, 'mockup'>[] = [
  'manifesto',
  'palette',
  'do-dont',
  'clear-space',
  'tone-of-voice',
];

export function PinnedPages() {
  const t = useTranslations('landing.pages');
  const reduce = useReducedMotion() ?? false;
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className={SECTION_TITLE}>
          <SplitWords text={t('title')} />
        </h2>
        <p className="mt-4 max-w-md text-ink-2">{t('lead')}</p>
      </div>
      <div aria-hidden="true" className="relative mt-10 h-[min(90vw,440px)]">
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
        <div className="no-scrollbar absolute inset-0 flex justify-start gap-7 overflow-x-auto px-6 pt-10 lg:justify-center">
          {HUNG.map((type, index) => {
            const sag = [14, 46, 58, 46, 14][index] ?? 30;
            const swing: CSSProperties & Record<'--a', string> = {
              '--a': `${String(index % 2 === 1 ? -2.5 : 2.5)}deg`,
              animationDelay: `${String(-index * 0.9)}s`,
              animationDuration: '5.5s',
            };
            return (
              <motion.div
                key={type}
                className="relative w-[min(70vw,340px)] shrink-0"
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
                <div className="swing" style={swing}>
                  <motion.div
                    drag
                    dragSnapToOrigin
                    dragElastic={0.5}
                    dragTransition={{ bounceStiffness: 180, bounceDamping: 14 }}
                    whileDrag={{ scale: 1.05, rotate: index % 2 === 1 ? 6 : -6 }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <span className="absolute -top-3 left-1/2 z-10 h-8 w-5 -translate-x-1/2 rounded-md bg-[oklch(0.62_0.02_80)] shadow" />
                    <div className="rounded-[18px] bg-[oklch(0.99_0.004_85)] p-2 pb-9 shadow-[0_34px_60px_-30px_oklch(0.2_0.01_60/0.55)]">
                      <div className="pointer-events-none overflow-hidden rounded-[10px]">
                        <DemoSheet type={type} />
                      </div>
                      <span className="absolute bottom-2.5 left-4 font-display text-sm text-[oklch(0.3_0.01_60)]">
                        {t('caption', { page: demoTitle(type) })}
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

function Tile({
  title,
  note,
  children,
  className = '',
}: {
  readonly title: string;
  readonly note: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <Reveal className={className}>
      <Tilt
        max={4}
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

export function Inside() {
  const t = useTranslations('landing.inside');
  const roles = useTranslations('workspace.roles');
  const pairs: readonly (readonly [ColorRole, ColorRole])[] = [
    ['neutralDark', 'primary'],
    ['neutralDark', 'neutralLight'],
    ['accent', 'neutralLight'],
    ['primary', 'neutralLight'],
  ];
  return (
    <section id="charte" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
      <h2 className={`${SECTION_TITLE} max-w-3xl`}>
        <SplitWords text={t('title')} />
      </h2>
      <p className="mt-4 max-w-[60ch] text-ink-2">{t('lead')}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Tile
          className="md:col-span-2 md:row-span-2"
          title={t('paletteTitle')}
          note={t('paletteNote')}
        >
          <div className="grid h-full min-h-[360px] grid-cols-3 grid-rows-[2fr_1fr_auto] gap-3">
            {COLOR_ROLES.map((role, index) => {
              const hex = colors[role];
              return (
                <div
                  key={role}
                  className={`flex flex-col justify-end rounded-[22px] border border-line p-4 ${index === 0 ? 'col-span-3' : 'col-span-1'}`}
                  style={{ background: hex, color: inkOn(hex) }}
                >
                  <span className="text-sm font-medium">{roles(role)}</span>
                  <span className="tabular font-mono text-xs opacity-80">{hex}</span>
                </div>
              );
            })}
            <div className="col-span-3 flex overflow-hidden rounded-[14px]">
              {buildScale(colors.primary).map((step) => (
                <span
                  key={step.step}
                  className="h-8 flex-1"
                  style={{ background: step.hex }}
                  title={step.hex}
                />
              ))}
            </div>
          </div>
        </Tile>
        <Tile title={t('contrastTitle')} note={t('contrastNote')}>
          <ul className="m-0 list-none space-y-2.5 p-0">
            {pairs.map(([text, background]) => {
              const ratio = contrastRatio(colors[text], colors[background]);
              const pass = ratio >= 4.5;
              return (
                <li
                  key={`${text}-${background}`}
                  className="flex items-center justify-between rounded-[16px] border border-line px-4 py-3"
                  style={{ background: colors[background], color: colors[text] }}
                >
                  <span className="font-display text-lg font-bold">Aa</span>
                  <span className="tabular flex items-center gap-1.5 font-mono text-sm">
                    {pass ? (
                      <Check aria-hidden="true" className="size-3.5" />
                    ) : (
                      <X aria-hidden="true" className="size-3.5" />
                    )}
                    {ratio.toFixed(2)} · {pass ? t('pass') : t('fail')}
                  </span>
                </li>
              );
            })}
          </ul>
        </Tile>
        <Tile title={t('typeTitle')} note={t('typeNote')}>
          <p
            className="m-0 text-[64px] leading-none text-ink"
            style={{ fontFamily: DEMO_VIEW.pairing.display.css }}
          >
            Aa
          </p>
          <p
            className="m-0 mt-4 text-lg text-ink"
            style={{ fontFamily: DEMO_VIEW.pairing.display.css }}
          >
            {DEMO_VIEW.pairing.display.name}
          </p>
          <p className="m-0 text-sm text-ink-2" style={{ fontFamily: DEMO_VIEW.pairing.text.css }}>
            {DEMO_VIEW.pairing.text.name}
          </p>
        </Tile>
        <Tile className="md:col-span-3" title={t('rulesTitle')} note={t('rulesNote')}>
          <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
            <div className="overflow-hidden rounded-[14px] border border-line">
              <DemoSheet type="clear-space" />
            </div>
            <dl className="m-0 flex flex-col justify-center gap-4">
              <div>
                <dt className="text-sm text-ink-3">{t('clearSpace')}</dt>
                <dd className="tabular m-0 font-mono text-2xl">
                  {Math.round(DEMO_VIEW.rules.clearSpaceRatio * 100)} %
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-3">{t('minScreen')}</dt>
                <dd className="tabular m-0 font-mono text-2xl">{DEMO_VIEW.rules.minSizePx} px</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-3">{t('minPrint')}</dt>
                <dd className="tabular m-0 font-mono text-2xl">{DEMO_VIEW.rules.minSizeMm} mm</dd>
              </div>
            </dl>
          </div>
        </Tile>
      </div>
    </section>
  );
}

export function Mockups() {
  const t = useTranslations('landing.mockups');
  const scenes = useTranslations('workspace.scenes');
  const reduce = useReducedMotion() ?? false;
  return (
    <section id="mockups" className="mx-2 scroll-mt-24 rounded-[40px] bg-elevated py-24 sm:mx-4">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className={SECTION_TITLE}>
          <SplitWords text={t('title')} />{' '}
          <span
            className="inline-block -rotate-2 rounded-[0.32em] px-[0.22em]"
            style={{ background: colors.neutralDark, color: inkOn(colors.neutralDark) }}
          >
            {t('highlight')}
          </span>
          .
        </h2>
        <p className="mt-4 max-w-[56ch] text-ink-2">{t('lead')}</p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SCENES.slice(0, 7).map((scene, index) => (
            <motion.figure
              key={scene}
              className={`relative m-0 ${index === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={reduce ? { duration: 0.1 } : { ...SOFT, delay: (index % 3) * 0.08 }}
            >
              <Tilt
                max={4}
                className="h-full overflow-hidden rounded-[28px] shadow-[0_40px_80px_-44px_oklch(0.2_0.01_60/0.6)]"
              >
                <MockupStage
                  failedLabel={t('failed')}
                  retryLabel={t('retry')}
                  scene={scene}
                  view={DEMO_VIEW}
                  label={t('alt', { brand: DEMO_VIEW.name, scene: scenes(scene) })}
                  className={index === 0 ? 'lg:[&>div]:aspect-[16/12]' : ''}
                />
              </Tilt>
              <figcaption className="absolute bottom-4 left-4 flex -rotate-2 items-center gap-1.5 rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-ink shadow-sm">
                {scenes(scene)}
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-ink-2">
                  {t('computed')}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const t = useTranslations('landing.faq');
  const [open, setOpen] = useState<number | null>(0);
  const items = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    q: t(`q${String(n)}`),
    a: t(`a${String(n)}`),
  }));
  return (
    <section
      id="questions"
      className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-4 py-24 md:grid-cols-[1fr_1.4fr]"
    >
      <h2 className="m-0 font-display text-[clamp(36px,6vw,76px)] leading-[0.92] font-extrabold tracking-[-0.03em]">
        <SplitWords text={t('title')} />
      </h2>
      <ul className="m-0 list-none space-y-3 p-0">
        {items.map(({ q, a }, index) => {
          const expanded = open === index;
          const id = `faq-${String(index)}`;
          return (
            <motion.li
              key={q}
              layout
              transition={SOFT}
              className="rounded-[24px] border border-line bg-surface px-6"
            >
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => {
                    setOpen(expanded ? null : index);
                  }}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium text-ink"
                >
                  {q}
                  <motion.span
                    animate={{ rotate: expanded ? 45 : 0 }}
                    transition={SOFT}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    id={id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="m-0 max-w-[62ch] pb-6 text-ink-2">{a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/** Closing call, with the example's colour scale turning slowly behind it. */
export function FinalCta() {
  const t = useTranslations('landing.final');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const ring = [...buildScale(colors.primary), ...buildScale(colors.accent)];
  return (
    <section className="relative overflow-clip px-4 pt-32 pb-[380px] text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[600px] left-1/2 size-[960px] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_30%,transparent_42%)]"
      >
        <div className="spin-slow relative size-full">
          {ring.map((step, index) => {
            const angle = (index / ring.length) * Math.PI * 2;
            return (
              <span
                key={`${step.hex}-${String(index)}`}
                className="absolute size-14 rounded-[18px] border border-line shadow-sm"
                style={{
                  left: `${String(50 + Math.cos(angle) * 46)}%`,
                  top: `${String(50 + Math.sin(angle) * 46)}%`,
                  transform: 'translate(-50%, -50%)',
                  background: step.hex,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="relative">
        <h2 className="m-0 font-display text-[clamp(44px,10vw,120px)] leading-[0.88] font-extrabold tracking-[-0.04em]">
          <SplitWords text={t('title')} />
        </h2>
        <Magnetic className="mt-8">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              router.push('/start');
            }}
            className="flex h-16 items-center gap-2 rounded-full bg-accent px-10 text-base font-semibold text-on-accent"
          >
            {loading ? (
              <Loader2
                aria-hidden="true"
                className="size-5 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ImageUp aria-hidden="true" className="size-5" />
            )}
            {t('cta')}
          </button>
        </Magnetic>
        <p className="mt-3 text-sm text-ink-3">{t('note')}</p>
      </div>
    </section>
  );
}

export function Footer() {
  const t = useTranslations('landing.footer');
  const reduce = useReducedMotion() ?? false;
  const letters = 'Charta'.split('');
  const links = [
    { href: '/start', label: t('start'), internal: true },
    { href: '#charte', label: t('example'), internal: false },
    { href: '#mockups', label: t('mockups'), internal: false },
    { href: '#questions', label: t('faq'), internal: false },
  ];
  const linkClass =
    'group inline-flex h-9 items-center gap-1 text-[oklch(0.9_0.008_85)] no-underline hover:text-[oklch(0.99_0.004_85)]';
  return (
    <footer
      className="relative mx-2 mb-2 overflow-hidden rounded-[40px] pt-16 sm:mx-4 sm:mb-4"
      style={{ background: 'oklch(0.16 0.01 60)', color: 'oklch(0.92 0.008 85)' }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="m-0 font-display text-3xl font-extrabold tracking-tight">Charta</p>
            <p className="mt-3 max-w-xs text-sm text-[oklch(0.8_0.008_85)]">{t('tagline')}</p>
          </div>
          <nav aria-label={t('product')}>
            <p className="m-0 mb-3 text-xs font-semibold tracking-wider text-[oklch(0.76_0.008_85)] uppercase">
              {t('product')}
            </p>
            <ul className="m-0 list-none p-0 text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  {link.internal ? (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="m-0 mb-3 text-xs font-semibold tracking-wider text-[oklch(0.76_0.008_85)] uppercase">
              {t('project')}
            </p>
            <p className="m-0 text-sm">{t('gdg')}</p>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-[oklch(1_0_0/0.1)] pt-6 text-xs text-[oklch(0.8_0.008_85)]">
          <span className="flex-1">{t('rights')}</span>
          <div className="flex items-center gap-2 [&_fieldset]:border-[oklch(1_0_0/0.15)] [&_fieldset]:bg-[oklch(0.22_0.01_60)] [&_label]:text-[oklch(0.8_0.008_85)] [&_label:has(:checked)]:bg-[oklch(0.3_0.01_60)] [&_label:has(:checked)]:text-[oklch(0.97_0.008_85)]">
            <LocaleSwitch />
            <ThemeSwitch />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="relative mt-8 overflow-hidden select-none">
        <div className="flex justify-center font-display text-[26vw] leading-[0.78] font-extrabold tracking-[-0.06em]">
          {letters.map((letter, index) => (
            <motion.span
              key={`${letter}-${String(index)}`}
              className="inline-block text-[oklch(0.3_0.01_60)]"
              initial={reduce ? { opacity: 0 } : { y: '60%', opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={
                reduce ? { duration: 0.1 } : { duration: 1, ease: EASE, delay: index * 0.08 }
              }
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </div>
    </footer>
  );
}
