'use client';

import { PAIRING_IDS, type PageType } from '@app/contracts';
import type { BrandDocument, Command, Page } from '@app/document';
import {
  Check,
  ChevronDown,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  contrastRatio,
  hexToOklch,
  inkOn,
  parseHexInput,
  withHue,
  withLightness,
} from '../../brand/color';
import { PAIRINGS } from '../../brand/pairings';
import { COLOR_ROLES, type ColorRole } from './brand-view';
import type { BrandPalette } from '@app/mockup-engine';
import { availableLogos } from '../mockups/objects';
import { MockupObjectPanel, type Directing } from './mockup-inspector';
import type { Selection } from './page-canvas';

// Right column (09 §7 PageInspector): it follows the selection. A page shows its own settings first, then
// the guideline values it is made of; every control emits one typed command, drawn at once and undoable.
type Section = 'palette' | 'typography' | 'logo' | 'texts';

const SECTIONS_BY_TYPE: Readonly<Record<PageType, readonly Section[]>> = {
  cover: ['palette', 'typography'],
  manifesto: ['texts', 'typography'],
  logo: ['logo', 'palette'],
  'clear-space': ['logo', 'palette'],
  'do-dont': ['logo', 'palette'],
  palette: ['palette'],
  contrast: ['palette'],
  typography: ['typography'],
  'tone-of-voice': ['texts', 'typography'],
  mockup: ['palette'],
  tokens: ['palette', 'typography', 'logo'],
};

const EASE = [0.16, 1, 0.3, 1] as const;

function Heading({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="m-0 mb-2.5 text-xs font-semibold tracking-[0.08em] text-ink-3 uppercase">
      {children}
    </h3>
  );
}

/** A range input that draws while dragged (preview) and records one command when released. */
function CommitRange({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  disabled = false,
  onPreview,
  onCommit,
  onCancel,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly format: (value: number) => string;
  readonly disabled?: boolean;
  readonly onPreview: (value: number) => void;
  readonly onCommit: (value: number) => void;
  readonly onCancel: () => void;
}) {
  const [local, setLocal] = useState(value);
  // Value when the gesture started: the shown document follows the preview, so the prop does too.
  const start = useRef<number | null>(null);
  // Latest value moved to: a key-up can arrive before React re-renders with it.
  const moved = useRef(value);
  useEffect(() => {
    if (start.current === null) setLocal(value);
  }, [value]);
  const end = (): void => {
    const from = start.current;
    start.current = null;
    if (from === null) return;
    if (moved.current !== from) onCommit(moved.current);
    else onCancel();
  };
  return (
    <label className="block text-xs text-ink-2">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="tabular font-mono text-ink-3">{format(local)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          start.current ??= local;
          moved.current = next;
          setLocal(next);
          onPreview(next);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyUp={end}
        onBlur={end}
        className="mt-1.5 h-6 w-full cursor-pointer disabled:cursor-not-allowed"
      />
    </label>
  );
}

function HexField({
  value,
  label,
  onCommit,
}: {
  readonly value: string;
  readonly label: string;
  readonly onCommit: (hex: string) => void;
}) {
  const t = useTranslations('workspace.inspector');
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setText(value);
    setInvalid(false);
  }, [value]);
  const commit = (): void => {
    const parsed = parseHexInput(text);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) onCommit(parsed);
    else setText(parsed);
  };
  const id = `hex-${label}`;
  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-2">
        {t('hex')}
      </label>
      <input
        id={id}
        value={text}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setText(value);
        }}
        className="tabular mt-1 h-10 w-full rounded-md border border-line-strong bg-canvas px-3 font-mono text-sm text-ink uppercase aria-invalid:border-danger"
      />
      {invalid ? (
        <p id={`${id}-error`} role="alert" className="m-0 mt-1 text-xs text-danger">
          {t('hexInvalid')}
        </p>
      ) : null}
    </div>
  );
}

function PaletteEditor({
  document,
  onPreview,
  onRun,
}: {
  readonly document: BrandDocument;
  readonly onPreview: (command: Command | null) => void;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace');
  const [open, setOpen] = useState<ColorRole | null>('primary');
  const colors = document.tokens.colors;
  const found = [
    ...new Set([
      ...COLOR_ROLES.map((role) => colors[role].hex),
      ...colors.extra.map((entry) => entry.hex),
    ]),
  ];
  const command = (role: ColorRole, hex: string): Command => ({
    type: 'SetColorToken',
    token: role,
    hex,
    source: 'user',
  });
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {COLOR_ROLES.map((role) => {
        const hex = colors[role].hex;
        const { L, C, h } = hexToOklch(hex);
        const expanded = open === role;
        const onLight = contrastRatio(hex, colors.neutralLight.hex);
        return (
          <li key={role} className="overflow-hidden rounded-lg border border-line bg-canvas">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                setOpen(expanded ? null : role);
              }}
              className="flex w-full items-center gap-3 p-2 text-left"
            >
              <motion.span
                className="size-9 shrink-0 rounded-md border border-line"
                initial={false}
                animate={{ backgroundColor: hex }}
                transition={{ duration: 0.25 }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{t(`roles.${role}`)}</span>
                <span className="tabular block font-mono text-xs text-ink-3">
                  {hex}
                  {role === 'neutralLight' ? null : ` · ${onLight.toFixed(1)}:1`}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 text-ink-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  <div className="flex flex-col gap-3 px-3 pt-1 pb-3">
                    <HexField
                      value={hex}
                      label={role}
                      onCommit={(next) => {
                        onRun(command(role, next));
                      }}
                    />
                    <CommitRange
                      label={t('inspector.hue')}
                      value={Math.round(h ?? 0)}
                      min={0}
                      max={359}
                      disabled={C < 0.02}
                      format={(value) => `${String(value)}°`}
                      onPreview={(value) => {
                        onPreview(command(role, withHue(hex, value)));
                      }}
                      onCancel={() => {
                        onPreview(null);
                      }}
                      onCommit={(value) => {
                        onRun(command(role, withHue(hex, value)));
                      }}
                    />
                    <CommitRange
                      label={t('inspector.lightness')}
                      value={Math.round(L * 100)}
                      min={5}
                      max={98}
                      format={(value) => `${String(value)} %`}
                      onPreview={(value) => {
                        onPreview(command(role, withLightness(hex, value / 100)));
                      }}
                      onCancel={() => {
                        onPreview(null);
                      }}
                      onCommit={(value) => {
                        onRun(command(role, withLightness(hex, value / 100)));
                      }}
                    />
                    <div>
                      <p className="m-0 mb-1.5 text-xs text-ink-2">{t('inspector.found')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {found.map((candidate) => (
                          <button
                            key={candidate}
                            type="button"
                            aria-label={t('inspector.use', { hex: candidate })}
                            title={candidate}
                            onClick={() => {
                              if (candidate !== hex) onRun(command(role, candidate));
                            }}
                            className="grid size-8 place-items-center rounded-md border border-line"
                            style={{ background: candidate }}
                          >
                            {candidate === hex ? (
                              <Check
                                aria-hidden="true"
                                className="size-4"
                                style={{ color: inkOn(candidate) }}
                              />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function TypographyPicker({
  document,
  onRun,
}: {
  readonly document: BrandDocument;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace');
  const current = document.tokens.typography.pairingId;
  return (
    <div
      role="radiogroup"
      aria-label={t('inspector.typography')}
      className="grid grid-cols-2 gap-2"
    >
      {PAIRING_IDS.map((id) => {
        const pairing = PAIRINGS[id];
        const checked = id === current;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => {
              if (!checked) onRun({ type: 'SetTypographyPairing', pairingId: id, expect: current });
            }}
            className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${checked ? 'border-ink bg-elevated' : 'border-line bg-canvas hover:border-line-strong'}`}
          >
            <span
              className="text-2xl leading-none text-ink"
              style={{ fontFamily: pairing.display.css }}
            >
              Aa
            </span>
            <span className="mt-1.5 block w-full truncate text-[11px] text-ink-2">
              {pairing.display.name}
            </span>
            <span
              className="block w-full truncate text-[11px] text-ink-3"
              style={{ fontFamily: pairing.text.css }}
            >
              {pairing.text.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LogoRules({
  document,
  onPreview,
  onRun,
}: {
  readonly document: BrandDocument;
  readonly onPreview: (command: Command | null) => void;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace.inspector');
  const rules = document.tokens.logo;
  const command = (patch: Partial<typeof rules>): Command => ({
    type: 'SetLogoRules',
    ...rules,
    ...patch,
  });
  return (
    <div className="flex flex-col gap-3">
      <CommitRange
        label={t('clearSpace')}
        value={Math.round(rules.clearSpaceRatio * 100)}
        min={10}
        max={50}
        format={(value) => `${String(value)} %`}
        onPreview={(value) => {
          onPreview(command({ clearSpaceRatio: value / 100 }));
        }}
        onCancel={() => {
          onPreview(null);
        }}
        onCommit={(value) => {
          onRun(command({ clearSpaceRatio: value / 100 }));
        }}
      />
      <CommitRange
        label={t('minPx')}
        value={rules.minSizePx}
        min={8}
        max={200}
        format={(value) => `${String(value)} px`}
        onPreview={(value) => {
          onPreview(command({ minSizePx: value }));
        }}
        onCancel={() => {
          onPreview(null);
        }}
        onCommit={(value) => {
          onRun(command({ minSizePx: value }));
        }}
      />
      <CommitRange
        label={t('minMm')}
        value={rules.minSizeMm}
        min={2}
        max={60}
        format={(value) => `${String(value)} mm`}
        onPreview={(value) => {
          onPreview(command({ minSizeMm: value }));
        }}
        onCancel={() => {
          onPreview(null);
        }}
        onCommit={(value) => {
          onRun(command({ minSizeMm: value }));
        }}
      />
      <p className="m-0 text-xs leading-relaxed text-ink-3">{t('measured')}</p>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onCommit,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <div>
      <label htmlFor={id} className="text-xs text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        value={text}
        rows={3}
        maxLength={600}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onBlur={() => {
          if (text.trim() !== value.trim()) onCommit(text.trim());
        }}
        className="mt-1 w-full resize-y rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm text-ink"
      />
    </div>
  );
}

function BrandTexts({
  document,
  onRun,
}: {
  readonly document: BrandDocument;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace.inspector');
  return (
    <div className="flex flex-col gap-3">
      <TextField
        id="brand-mission"
        label={t('mission')}
        value={document.brand.mission}
        onCommit={(value) => {
          onRun({ type: 'SetBrandField', field: 'mission', value });
        }}
      />
      <TextField
        id="brand-vision"
        label={t('vision')}
        value={document.brand.vision}
        onCommit={(value) => {
          onRun({ type: 'SetBrandField', field: 'vision', value });
        }}
      />
    </div>
  );
}

function PageSettings({
  page,
  document,
  onRun,
}: {
  readonly page: Page;
  readonly document: BrandDocument;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace');
  const [title, setTitle] = useState(page.title);
  useEffect(() => {
    setTitle(page.title);
  }, [page.title]);
  const portrait = page.overrides.format === 'portrait';
  const background = page.overrides.background;
  const swatches = COLOR_ROLES.map((role) => document.tokens.colors[role].hex);
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label htmlFor="page-title" className="text-xs text-ink-2">
          {t('inspector.title')}
        </label>
        <input
          id="page-title"
          value={title}
          maxLength={80}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          onBlur={() => {
            const next = title.trim();
            if (next !== '' && next !== page.title)
              onRun({
                type: 'SetPageField',
                pageId: page.id,
                field: 'title',
                value: next,
                expect: page.title,
              });
            else setTitle(page.title);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="mt-1 h-10 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm text-ink"
        />
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1 p-0 text-xs text-ink-2">{t('inspector.format')}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-canvas p-1">
          {(['landscape', 'portrait'] as const).map((format) => {
            const active = (format === 'portrait') === portrait;
            const Icon = format === 'portrait' ? RectangleVertical : RectangleHorizontal;
            return (
              <button
                key={format}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (active) return;
                  onRun(
                    format === 'portrait'
                      ? {
                          type: 'SetPageOverride',
                          pageId: page.id,
                          key: 'format',
                          value: 'portrait',
                        }
                      : { type: 'ClearPageOverride', pageId: page.id, key: 'format' },
                  );
                }}
                className="relative flex h-9 items-center justify-center gap-1.5 rounded-full text-xs text-ink-2 aria-pressed:text-ink"
              >
                {active ? (
                  <motion.span
                    layoutId="format-pill"
                    className="absolute inset-0 rounded-full bg-elevated"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                ) : null}
                <Icon aria-hidden="true" className="relative size-4" />
                <span className="relative">{t(`format.${format}`)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div>
        <p className="m-0 mb-1.5 flex items-center justify-between text-xs text-ink-2">
          {t('inspector.background')}
          {background === undefined ? null : (
            <button
              type="button"
              onClick={() => {
                onRun({ type: 'ClearPageOverride', pageId: page.id, key: 'background' });
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-ink-3 hover:bg-elevated hover:text-ink"
            >
              <RotateCcw aria-hidden="true" className="size-3" />
              {t('inspector.reset')}
            </button>
          )}
        </p>
        <div className="flex gap-1.5">
          {swatches.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={t('inspector.useBackground', { hex })}
              aria-pressed={background === hex}
              onClick={() => {
                onRun({ type: 'SetPageOverride', pageId: page.id, key: 'background', value: hex });
              }}
              className="grid size-8 place-items-center rounded-md border border-line"
              style={{ background: hex }}
            >
              {background === hex ? (
                <Check aria-hidden="true" className="size-4" style={{ color: inkOn(hex) }} />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Inspector({
  document,
  selection,
  onPreview,
  onRun,
  brand,
  colors,
  directing,
}: {
  readonly brand: string;
  readonly colors: BrandPalette;
  readonly directing: Directing;
  readonly document: BrandDocument | null;
  readonly selection: Selection | null;
  readonly onPreview: (command: Command | null) => void;
  readonly onRun: (command: Command) => void;
}) {
  const t = useTranslations('workspace');
  if (document === null)
    return (
      <div className="p-4">
        <Heading>{t('inspector.label')}</Heading>
        <p className="m-0 text-sm text-ink-3">{t('inspector.empty')}</p>
      </div>
    );
  const page =
    selection?.kind === 'page'
      ? document.pages.find((entry) => entry.id === selection.id)
      : undefined;
  const sections: readonly Section[] =
    page !== undefined ? SECTIONS_BY_TYPE[page.type] : ['palette', 'typography', 'logo'];
  const hasVariant = (kind: 'mono-black' | 'mono-white'): string | null =>
    document.assets.variants.some((variant) => variant.kind === kind) ? kind : null;
  return (
    <div className="flex flex-col gap-6 p-4">
      {page !== undefined ? (
        <section aria-label={t('inspector.page')}>
          <Heading>{t('inspector.page')}</Heading>
          <PageSettings key={page.id} page={page} document={document} onRun={onRun} />
        </section>
      ) : selection?.kind === 'mockup' ? (
        <section aria-label={t('mockups')}>
          <Heading>{t(`scenes.${selection.id}`)}</Heading>
          <p className="m-0 mb-3 text-sm leading-relaxed text-ink-2">{t('inspector.mockup')}</p>
          <MockupObjectPanel
            scene={selection.id}
            objectId={selection.object}
            brand={brand}
            colors={colors}
            logos={availableLogos({
              'mono-black': hasVariant('mono-black'),
              'mono-white': hasVariant('mono-white'),
            })}
            directing={directing}
          />
        </section>
      ) : null}
      {sections.map((section) => (
        <section key={section} aria-label={t(`inspector.${section}`)}>
          <Heading>{t(`inspector.${section}`)}</Heading>
          {section === 'palette' ? (
            <PaletteEditor document={document} onPreview={onPreview} onRun={onRun} />
          ) : section === 'typography' ? (
            <TypographyPicker document={document} onRun={onRun} />
          ) : section === 'logo' ? (
            <LogoRules document={document} onPreview={onPreview} onRun={onRun} />
          ) : (
            <BrandTexts document={document} onRun={onRun} />
          )}
        </section>
      ))}
      <p className="m-0 text-xs leading-relaxed text-ink-3">{t('inspector.note')}</p>
    </div>
  );
}
