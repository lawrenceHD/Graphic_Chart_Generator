import { AnimatePresence, motion } from 'motion/react';
import { useReduce } from '../lib/motion-pref';
import { ArrowLeft, ArrowRight, Check, ImageUp, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { BRANDS, svgUrl } from '../lib/brand';
import { item, itemReduced, spring, stagger } from '../lib/motion';
import { navigate } from '../router';

// The Stitch-like entry: one large field for the brief, the logo next to it, then straight into the studio.
// In the prototype, "uploading" picks one of the corpus logos already run through the engines.
const UNIVERSES = [
  'Artisanat',
  'Tech',
  'Santé',
  'Mode',
  'Restauration',
  'Éducation',
  'Sport',
  'Culture',
  'Finance',
  'Voyage',
];

export function Start() {
  const reduce = useReduce();
  const [slug, setSlug] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const brand = BRANDS.find((b) => b.slug === slug);

  const pick = (next: string) => {
    setSlug(next);
    const found = BRANDS.find((b) => b.slug === next);
    if (found && brief === '') setBrief(found.brief);
  };
  const go = () => {
    if (!slug) return;
    setSending(true);
    setTimeout(() => navigate(`/studio/${slug}`), reduce ? 0 : 650);
  };

  return (
    <div className="theme-studio min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-10 items-center gap-2 rounded-full px-2 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Accueil
        </button>
        <span className="font-display text-lg font-bold tracking-tight">Charta</span>
      </header>
      <motion.main
        variants={stagger(0.08)}
        initial="hidden"
        animate="shown"
        className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:pt-16"
      >
        <motion.h1
          variants={reduce ? itemReduced : item}
          className="m-0 font-display text-[clamp(36px,8vw,64px)] font-bold leading-[0.95] tracking-tight"
        >
          Quelle marque
          <br />
          on habille <span className="text-accent">aujourd'hui{' '}?</span>
        </motion.h1>
        <motion.p variants={reduce ? itemReduced : item} className="mt-4 max-w-xl text-ink-2">
          Déposez votre logo et décrivez votre univers. La charte se construit sous vos yeux, page
          après page.
        </motion.p>

        <motion.div
          variants={reduce ? itemReduced : item}
          className="mt-8 rounded-[var(--radius-xl)] border border-line-strong bg-surface p-3 focus-within:border-focus sm:p-4"
        >
          <label htmlFor="brief" className="sr-only">
            Décrivez votre univers
          </label>
          <textarea
            id="brief"
            rows={4}
            value={brief}
            maxLength={8000}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Ex. : torréfaction de quartier, chaleureuse et lettrée, clientèle de connaisseurs…"
            className="w-full resize-none bg-transparent p-2 text-base text-ink outline-none placeholder:text-ink-3"
          />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            {UNIVERSES.map((universe) => (
              <button
                key={universe}
                type="button"
                onClick={() =>
                  setBrief((b) => (b.includes(universe) ? b : `${b}${b ? ' · ' : ''}${universe}`))
                }
                className="h-9 shrink-0 rounded-full border border-line px-3 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                {universe}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm text-ink-2 hover:text-ink"
            >
              <ImageUp className="h-5 w-5" aria-hidden />
              {brand ? `Logo : ${brand.name}` : 'Choisir un fichier'}
            </button>
            <input
              ref={input}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={() => pick(BRANDS[0]!.slug)}
            />
            <span className="text-xs text-ink-3 sm:flex-1">SVG, PNG, JPEG ou WebP · 10 Mo max</span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={!slug || sending}
              onClick={go}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : null}
              Générer la charte
              {!sending && <ArrowRight className="h-4 w-4" aria-hidden />}
            </motion.button>
          </div>
        </motion.div>

        <motion.section
          variants={reduce ? itemReduced : item}
          className="mt-10"
          aria-labelledby="examples"
        >
          <h2 id="examples" className="mb-3 text-sm font-medium text-ink-2">
            Ou essayez avec un logo du corpus
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {BRANDS.map((b) => {
              const chosen = b.slug === slug;
              return (
                <motion.button
                  key={b.slug}
                  type="button"
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  aria-pressed={chosen}
                  onClick={() => pick(b.slug)}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border bg-preview p-3 ${chosen ? 'border-accent' : 'border-line'}`}
                >
                  <span className="grid h-3/5 w-4/5 place-items-center rounded-[18px] bg-white p-2">
                    <img src={svgUrl(b.logo)} alt="" className="h-full w-full object-contain" />
                  </span>
                  <span className="text-xs text-ink">{b.name}</span>
                  <AnimatePresence>
                    {chosen && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={spring}
                        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
}
