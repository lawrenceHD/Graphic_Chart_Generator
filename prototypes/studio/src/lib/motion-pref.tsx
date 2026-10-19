import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Motion preference: "system" follows prefers-reduced-motion (09 §4, the default), "on" and "off" are the
// viewer's explicit choice, remembered on this device only. Every animated component reads useReduce().
export type MotionPref = 'system' | 'on' | 'off';
interface MotionState {
  pref: MotionPref;
  setPref: (pref: MotionPref) => void;
  reduce: boolean;
  systemReduces: boolean;
}
const Context = createContext<MotionState>({
  pref: 'system',
  setPref: () => undefined,
  reduce: false,
  systemReduces: false,
});
const STORAGE = 'charta.motion';

function readPref(): MotionPref {
  try {
    const value = window.localStorage.getItem(STORAGE);
    return value === 'on' || value === 'off' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function MotionPreference({ children }: { children: ReactNode }) {
  const query = '(prefers-reduced-motion: reduce)';
  const [systemReduces, setSystemReduces] = useState(() => window.matchMedia(query).matches);
  const [pref, setPrefState] = useState<MotionPref>(readPref);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setSystemReduces(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  const reduce = pref === 'off' || (pref === 'system' && systemReduces);
  useEffect(() => {
    document.documentElement.dataset.motion = reduce ? 'off' : 'on';
  }, [reduce]);
  const setPref = (next: MotionPref) => {
    setPrefState(next);
    try {
      window.localStorage.setItem(STORAGE, next);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  };
  return (
    <Context.Provider value={{ pref, setPref, reduce, systemReduces }}>
      <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
        {children}
        <MotionNotice />
      </MotionConfig>
    </Context.Provider>
  );
}

export const useMotionPref = (): MotionState => useContext(Context);
export const useReduce = (): boolean => useContext(Context).reduce;

/** Shown once when the system asks for reduced motion: the viewer may still opt in. */
function MotionNotice() {
  const { pref, setPref, systemReduces } = useMotionPref();
  const [dismissed, setDismissed] = useState(false);
  const visible = systemReduces && pref === 'system' && !dismissed;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Préférence d'animation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 rounded-full border border-black/10 bg-[#141414] py-2 pl-4 pr-2 text-sm text-white shadow-2xl"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[#ffd166]" aria-hidden />
          <span className="flex-1 leading-tight">Votre système réduit les animations.</span>
          <button
            type="button"
            onClick={() => setPref('on')}
            className="h-10 shrink-0 rounded-full bg-white px-4 font-semibold text-[#141414]"
          >
            Les activer
          </button>
          <button
            type="button"
            aria-label="Garder réduites"
            onClick={() => setDismissed(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small control for headers: cycles system → on → off. */
export function MotionToggle({ className = '' }: { className?: string }) {
  const { pref, setPref, reduce } = useMotionPref();
  const next: Record<MotionPref, MotionPref> = { system: 'on', on: 'off', off: 'system' };
  const label =
    pref === 'system'
      ? `Animations : système (${reduce ? 'réduites' : 'actives'})`
      : pref === 'on'
        ? 'Animations : activées'
        : 'Animations : désactivées';
  return (
    <button
      type="button"
      onClick={() => setPref(next[pref])}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-full ${className}`}
    >
      <Sparkles className={`h-5 w-5 ${reduce ? 'opacity-40' : ''}`} aria-hidden />
    </button>
  );
}
