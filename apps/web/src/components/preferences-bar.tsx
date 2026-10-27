'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { savePreference } from '../app/actions/preferences';
import { LOCALES, type Locale } from '../i18n/locale';
import { THEME_PREFERENCES, themeAttribute, type ThemePreference } from '../theme/preference';

type Option<T extends string> = { readonly value: T; readonly label: string };

/** Native radio group: arrow keys, Tab and screen readers work without extra code (09 §5). */
function Segmented<T extends string>(props: {
  readonly name: string;
  readonly legend: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">{props.legend}</legend>
      <span aria-hidden="true" className="text-sm text-ink-2">
        {props.legend}
      </span>
      <div className="flex rounded-md border border-line-strong p-0.5">
        {props.options.map((option) => (
          <label
            key={option.value}
            className="relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm px-3 text-sm text-ink-2 has-checked:bg-accent has-checked:text-on-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name={props.name}
              value={option.value}
              checked={option.value === props.value}
              onChange={() => {
                props.onChange(option.value);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PreferencesBar({ initialTheme }: { readonly initialTheme: ThemePreference }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const applyTheme = (preference: ThemePreference): void => {
    setTheme(preference);
    const attribute = themeAttribute(preference);
    if (attribute === undefined) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = attribute;
  };

  // A failed save (refused or network error) is shown, never swallowed.
  const save = async (input: Parameters<typeof savePreference>[0]): Promise<boolean> => {
    const saved = await savePreference(input).catch(() => ({ ok: false }));
    setFailed(!saved.ok);
    return saved.ok;
  };

  const changeTheme = (next: ThemePreference): void => {
    const previous = theme;
    // Immediate feedback (≤ 100 ms, 09 §4); the cookie keeps it for the next visit.
    applyTheme(next);
    startTransition(async () => {
      if (!(await save({ kind: 'theme', value: next }))) applyTheme(previous);
    });
  };

  const changeLocale = (next: Locale): void => {
    startTransition(async () => {
      if (await save({ kind: 'locale', value: next })) router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={t('common.preferences')}
      className="flex flex-wrap items-center gap-4"
    >
      <Segmented
        name="theme"
        legend={t('theme.label')}
        options={THEME_PREFERENCES.map((value) => ({ value, label: t(`theme.${value}`) }))}
        value={theme}
        onChange={changeTheme}
      />
      <Segmented
        name="locale"
        legend={t('locale.label')}
        options={LOCALES.map((value) => ({ value, label: t(`locale.${value}`) }))}
        value={LOCALES.find((value) => value === locale) ?? LOCALES[0]}
        onChange={changeLocale}
      />
      {failed && (
        <p role="alert" className="text-sm text-danger">
          <span className="font-semibold">
            {t('status.danger')}
            {t('status.separator')}
          </span>
          {t('common.saveFailed')}
        </p>
      )}
    </div>
  );
}
