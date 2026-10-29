'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { savePreference } from '../app/actions/preferences';
import { LOCALES, type Locale } from '../i18n/locale';
import { THEME_PREFERENCES, themeAttribute, type ThemePreference } from '../theme/preference';

// The theme chosen on the server (cookie) is shared with every compact switch of the screens: the landing
// nav, the start screen and the studio top bar each carry their own, without a second source of truth.
const ThemeContext = createContext<{
  readonly theme: ThemePreference;
  readonly setTheme: (next: ThemePreference) => void;
}>({ theme: 'system', setTheme: () => undefined });

export function PreferencesProvider({
  initialTheme,
  children,
}: {
  readonly initialTheme: ThemePreference;
  readonly children: ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [, startTransition] = useTransition();

  const apply = (preference: ThemePreference): void => {
    setThemeState(preference);
    const attribute = themeAttribute(preference);
    if (attribute === undefined) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = attribute;
  };

  const setTheme = (next: ThemePreference): void => {
    const previous = theme;
    apply(next);
    startTransition(async () => {
      const saved = await savePreference({ kind: 'theme', value: next }).catch(() => ({
        ok: false,
      }));
      if (!saved.ok) apply(previous);
    });
  };

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** Three-state theme switch (owner decision 2026-10-23): a native radio group, icons with names. */
export function ThemeSwitch({ className = '' }: { readonly className?: string }) {
  const t = useTranslations('theme');
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <fieldset
      className={`m-0 flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}
    >
      <legend className="sr-only">{t('label')}</legend>
      {THEME_PREFERENCES.map((value) => {
        const Icon = THEME_ICONS[value];
        return (
          <label
            key={value}
            title={t(value)}
            className="relative grid size-9 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:text-ink has-checked:bg-elevated has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => {
                setTheme(value);
              }}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-4" />
            <span className="sr-only">{t(value)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** FR / EN: the saved locale re-renders the server components (next-intl reads the cookie). */
export function LocaleSwitch({ className = '' }: { readonly className?: string }) {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = LOCALES.find((value) => value === locale) ?? LOCALES[0];
  const change = (next: Locale): void => {
    startTransition(async () => {
      const saved = await savePreference({ kind: 'locale', value: next }).catch(() => ({
        ok: false,
      }));
      if (saved.ok) router.refresh();
    });
  };
  return (
    <fieldset
      aria-busy={pending}
      className={`m-0 flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}
    >
      <legend className="sr-only">{t('label')}</legend>
      {LOCALES.map((value) => (
        <label
          key={value}
          title={t(value)}
          className="grid h-9 min-w-9 cursor-pointer place-items-center rounded-full px-2 font-mono text-xs text-ink-3 uppercase transition-colors hover:text-ink has-checked:bg-elevated has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            name="locale"
            value={value}
            checked={current === value}
            onChange={() => {
              change(value);
            }}
            className="sr-only"
          />
          <span aria-hidden="true">{value}</span>
          <span className="sr-only">{t(value)}</span>
        </label>
      ))}
    </fieldset>
  );
}
