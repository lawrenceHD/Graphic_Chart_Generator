'use client';

import type { MockupFinish } from '@app/contracts';
import type {
  BrandPalette,
  LogoVersion,
  SurfaceChoices,
  SurfaceDirection,
} from '@app/mockup-engine';
import { Download, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { objectsOfScene } from '../mockups/scene-hits';
import { exportScenePng, exportScenesZip } from '../mockups/scene-export';
import { exportFileName, PAINT_ROLES, type PaintRole } from '../mockups/objects';

// Settings of the object selected in a mockup scene (06_MOCKUP_ENGINE.md §4.3): what the scene lets this
// object take, and only that. Each setting is a radio group (arrows, Space), "Auto" being the art direction
// of the engine. An object a scene fixes says so rather than offering a control that does nothing.

/** What the panel needs from the workspace: the choices, what automatic gave, and the history. */
export interface Directing {
  readonly choices: (scene: string) => SurfaceChoices;
  readonly directions: Readonly<Record<string, readonly SurfaceDirection[]>>;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onChoose: (scene: string, object: string, patch: unknown) => void;
  readonly onReset: (scene: string, object: string) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

const AUTO = 'auto';

function Option({
  group,
  value,
  checked,
  onPick,
  swatch,
  children,
}: {
  readonly group: string;
  readonly value: string;
  readonly checked: boolean;
  readonly onPick: () => void;
  readonly swatch?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <label className="relative inline-flex">
      <input
        type="radio"
        name={group}
        value={value}
        checked={checked}
        onChange={onPick}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs text-ink-2 hover:bg-elevated peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
        {swatch === undefined ? null : (
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-line-strong"
            style={{ background: swatch }}
          />
        )}
        {children}
      </span>
    </label>
  );
}

function Group({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1.5">
      <span
        aria-hidden="true"
        className="text-xs font-semibold tracking-[0.08em] text-ink-3 uppercase"
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const iconButton =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45';

export function MockupObjectPanel({
  scene,
  objectId,
  brand,
  colors,
  logos,
  directing,
}: {
  readonly scene: string;
  readonly objectId: string | undefined;
  readonly brand: string;
  readonly colors: BrandPalette;
  readonly logos: readonly LogoVersion[];
  readonly directing: Directing;
}) {
  const t = useTranslations('workspace.mockup');
  const tf = useTranslations('workspace.proof.finish');
  const tr = useTranslations('workspace.roles');
  const [message, setMessage] = useState('');
  const { onUndo, onRedo } = directing;

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) walk the history of the choices while a scene is selected.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        setMessage(t('announce.undone'));
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        onRedo();
        setMessage(t('announce.redone'));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [onUndo, onRedo, t]);

  const objects = objectsOfScene(scene);
  const index = objects.findIndex((entry) => entry.id === objectId);
  const object = objects[index];
  const choice = object === undefined ? {} : (directing.choices(scene)[object.id] ?? {});
  const applied =
    object === undefined
      ? undefined
      : directing.directions[scene]?.find((entry) => entry.surfaceId === object.id);
  const objectName = t(`object.${object?.kind ?? 'surface'}`, { n: index + 1 });

  const paintName = (role: PaintRole): string => tr(role);
  const paintOf = (hex: string | null): string => {
    if (hex === null) return t('stock');
    const role = PAINT_ROLES.find((entry) => colors[entry] === hex);
    return role === undefined ? hex : paintName(role);
  };
  const logoName = (version: LogoVersion): string => t(`logoVersion.${version}`);

  const choose = (
    group: 'logo' | 'finish' | 'paint',
    patch: {
      logo?: LogoVersion | null;
      finish?: MockupFinish | null;
      paint?: PaintRole | 'none' | null;
    },
    value: string | null,
  ): void => {
    if (object === undefined) return;
    directing.onChoose(scene, object.id, patch);
    setMessage(
      value === null
        ? t('announce.auto', { object: objectName, group: t(`groups.${group}`) })
        : t('announce.set', { object: objectName, group: t(`groups.${group}`), value }),
    );
  };

  const exportPng = (): void => {
    void exportScenePng(brand, scene).then((done) => {
      setMessage(
        done ? t('exported.png', { file: exportFileName(brand, scene) }) : t('exported.failed'),
      );
    });
  };
  const exportZip = (): void => {
    void exportScenesZip(brand).then((count) => {
      setMessage(count > 0 ? t('exported.zip', { count }) : t('exported.failed'));
    });
  };

  const hasChoice =
    choice.logo !== undefined || choice.finish !== undefined || choice.paint !== undefined;
  const paints: readonly PaintRole[] = object?.paints ?? [];

  return (
    <section aria-label={t('inspectorTitle')} className="flex flex-col gap-4">
      {object === undefined ? (
        <p className="m-0 text-sm text-ink-3">{t('pickHint')}</p>
      ) : (
        <>
          <p className="m-0 text-sm font-medium text-ink">{objectName}</p>
          {object.kind === 'surface' ? (
            <Group label={t('groups.logo')}>
              <Option
                group="logo"
                value={AUTO}
                checked={choice.logo === undefined}
                onPick={() => {
                  choose('logo', { logo: null }, null);
                }}
              >
                {applied === undefined
                  ? t('auto')
                  : t('autoNow', { value: logoName(applied.logo) })}
              </Option>
              {logos.map((version) => (
                <Option
                  key={version}
                  group="logo"
                  value={version}
                  checked={choice.logo === version}
                  onPick={() => {
                    choose('logo', { logo: version }, logoName(version));
                  }}
                >
                  {logoName(version)}
                </Option>
              ))}
            </Group>
          ) : (
            <p className="m-0 text-sm text-ink-2">{t('available.logoFixed')}</p>
          )}
          {object.finishes.length > 1 ? (
            <Group label={t('groups.finish')}>
              <Option
                group="finish"
                value={AUTO}
                checked={choice.finish === undefined}
                onPick={() => {
                  choose('finish', { finish: null }, null);
                }}
              >
                {applied === undefined ? t('auto') : t('autoNow', { value: tf(applied.finish) })}
              </Option>
              {object.finishes.map((finish) => (
                <Option
                  key={finish}
                  group="finish"
                  value={finish}
                  checked={choice.finish === finish}
                  onPick={() => {
                    choose('finish', { finish }, tf(finish));
                  }}
                >
                  {tf(finish)}
                </Option>
              ))}
            </Group>
          ) : (
            <p className="m-0 text-sm text-ink-2">{t('available.finishFixed')}</p>
          )}
          {paints.length > 0 ? (
            <Group label={t('groups.paint')}>
              <Option
                group="paint"
                value={AUTO}
                checked={choice.paint === undefined}
                onPick={() => {
                  choose('paint', { paint: null }, null);
                }}
                swatch={applied?.background}
              >
                {applied === undefined
                  ? t('auto')
                  : t('autoNow', { value: paintOf(applied.paint) })}
              </Option>
              {paints.map((role) => (
                <Option
                  key={role}
                  group="paint"
                  value={role}
                  checked={choice.paint === role}
                  onPick={() => {
                    choose('paint', { paint: role }, paintName(role));
                  }}
                  swatch={colors[role]}
                >
                  {paintName(role)}
                </Option>
              ))}
              {object.original ? (
                <Option
                  group="paint"
                  value="none"
                  checked={choice.paint === 'none'}
                  onPick={() => {
                    choose('paint', { paint: 'none' }, t('stock'));
                  }}
                >
                  {t('stock')}
                </Option>
              ) : null}
            </Group>
          ) : (
            <p className="m-0 text-sm text-ink-2">{t('available.paintFixed')}</p>
          )}
          <button
            type="button"
            disabled={!hasChoice}
            onClick={() => {
              directing.onReset(scene, object.id);
              setMessage(t('announce.reset', { object: objectName }));
            }}
            className={`${iconButton} self-start`}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            {t('reset')}
          </button>
        </>
      )}
      <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
        <button
          type="button"
          disabled={!directing.canUndo}
          onClick={() => {
            directing.onUndo();
            setMessage(t('announce.undone'));
          }}
          className={iconButton}
        >
          <Undo2 aria-hidden="true" className="size-3.5" />
          {t('undo')}
        </button>
        <button
          type="button"
          disabled={!directing.canRedo}
          onClick={() => {
            directing.onRedo();
            setMessage(t('announce.redone'));
          }}
          className={iconButton}
        >
          <Redo2 aria-hidden="true" className="size-3.5" />
          {t('redo')}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={exportPng} className={`${iconButton} justify-center`}>
          <Download aria-hidden="true" className="size-3.5" />
          {t('exportPng')}
        </button>
        <button type="button" onClick={exportZip} className={`${iconButton} justify-center`}>
          <Download aria-hidden="true" className="size-3.5" />
          {t('exportZip')}
        </button>
      </div>
      <p className="m-0 text-xs text-ink-3">{t('keys')}</p>
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}
