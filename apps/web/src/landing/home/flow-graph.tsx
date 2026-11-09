'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Braces, Check, Ruler, Shirt, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Float, SplitWords } from '../../ui/fx';
import { useBrand } from './brand-context';
import { colorOf } from './palette-tools';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;

interface Node {
  readonly key: 'palette' | 'type' | 'contrast' | 'mockups' | 'rules' | 'tokens';
  readonly x: number;
  readonly y: number;
}
const NODES: readonly Node[] = [
  { key: 'palette', x: 22, y: 16 },
  { key: 'type', x: 78, y: 14 },
  { key: 'contrast', x: 20, y: 70 },
  { key: 'mockups', x: 82, y: 68 },
  { key: 'rules', x: 30, y: 92 },
  { key: 'tokens', x: 70, y: 92 },
];

/** One logo, a whole system: nodes linked by flowing curves, each carrying a value read from the brand. */
export function FlowGraph() {
  const t = useTranslations('homePage.flow');
  const reduce = useReducedMotion() ?? false;
  const { example } = useBrand();
  const primary = colorOf(example, 'primary');
  const accent = colorOf(example, 'accent');
  const body: Readonly<Record<Node['key'], ReactNode>> = {
    palette: (
      <span className="flex gap-1.5">
        {example.colors.map((color) => (
          <span
            key={color.role}
            className="size-6 rounded-lg border border-line"
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </span>
    ),
    type: (
      <span className="flex items-center gap-1.5">
        <Type className="size-4" aria-hidden="true" />
        <span className="font-display text-2xl leading-none">Aa</span>
      </span>
    ),
    contrast: (
      <span className="font-mono text-sm">
        {example.contrasts[0]?.ratio}:1{' '}
        <Check className="inline size-3.5 text-success" aria-hidden="true" />
      </span>
    ),
    mockups: <Shirt className="size-6" aria-hidden="true" />,
    rules: <Ruler className="size-6" aria-hidden="true" />,
    tokens: <Braces className="size-6" aria-hidden="true" />,
  };
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="m-0 text-center font-display text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-balance">
        <SplitWords text={t('title')} />
      </h2>
      <div className="relative mx-auto mt-12 aspect-[4/5] max-w-5xl sm:aspect-[16/10]">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {NODES.map((node, index) => {
            const d = `M50 50 C ${String(50 + (node.x - 50) * 0.2)} ${String(node.y)}, ${String(node.x + (50 - node.x) * 0.4)} ${String(node.y)}, ${String(node.x)} ${String(node.y)}`;
            return (
              <g key={node.key}>
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
                  stroke={index % 2 > 0 ? accent : primary}
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
          className="absolute top-1/2 left-1/2 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[40px] border border-line bg-preview shadow-[0_40px_80px_-40px_rgb(0_0_0/0.5)] sm:size-44"
          initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={SOFT}
        >
          <span
            aria-hidden="true"
            className="pulse-dot absolute inset-0 rounded-[40px] border-2"
            style={{ borderColor: primary, animationDuration: '3s' }}
          />
          <img
            src={example.logo}
            alt={t('logoAlt', { brand: example.name })}
            className="size-3/5 object-contain"
          />
        </motion.div>
        {NODES.map((node, index) => (
          <motion.div
            key={node.key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${String(node.x)}%`, top: `${String(node.y)}%` }}
            initial={{ scale: reduce ? 1 : 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...SOFT, delay: 0.6 + index * 0.1 }}
          >
            <Float delay={index} duration={7 + (index % 3)}>
              <div className="flex flex-col items-start gap-1.5 rounded-[20px] border border-line bg-surface px-3 py-2 shadow-[0_20px_40px_-26px_rgb(0_0_0/0.45)] sm:gap-2 sm:rounded-[24px] sm:px-4 sm:py-3">
                <span className="text-xs font-medium text-ink-3">{t(node.key)}</span>
                {body[node.key]}
              </div>
            </Float>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
