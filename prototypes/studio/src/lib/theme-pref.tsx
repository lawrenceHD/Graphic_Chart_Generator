import { Monitor, Moon, Sun } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Theme of the studio screens (owner's decision 2026-10-23): "system" follows prefers-color-scheme (the
// default), "light" and "dark" are the viewer's explicit choice, remembered on this device only. The resolved
// theme lands on <html data-theme>, which styles.css reads; index.html sets it before the first paint.
export type ThemePref = 'system' | 'light' | 'dark';
interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
  dark: boolean;
}
const Context = createContext<ThemeState>({
  pref: 'system',
  setPref: () => undefined,
  dark: false,
});
const STORAGE = 'charta.theme';
const QUERY = '(prefers-color-scheme: dark)';

function readPref(): ThemePref {
  try {
    const value = window.localStorage.getItem(STORAGE);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function ThemePreference({ children }: { children: ReactNode }) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(QUERY).matches);
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  useEffect(() => {
    const list = window.matchMedia(QUERY);
    const onChange = () => setSystemDark(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  const dark = pref === 'dark' || (pref === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  const setPref = (next: ThemePref) => {
    setPrefState(next);
    try {
      window.localStorage.setItem(STORAGE, next);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  };
  return <Context.Provider value={{ pref, setPref, dark }}>{children}</Context.Provider>;
}

export const useTheme = (): ThemeState => useContext(Context);

const CHOICES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Système', Icon: Monitor },
  { value: 'light', label: 'Jour', Icon: Sun },
  { value: 'dark', label: 'Nuit', Icon: Moon },
];

/** Three-way segmented control: Système · Jour · Nuit. */
export function ThemeSwitch({ className = '' }: { className?: string }) {
  const { pref, setPref } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className={`flex h-10 items-center rounded-full border border-line bg-surface p-0.5 ${className}`}
    >
      {CHOICES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          onClick={() => setPref(value)}
          className={`grid h-full w-9 place-items-center rounded-full transition-colors ${
            pref === value ? 'bg-elevated text-ink' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
