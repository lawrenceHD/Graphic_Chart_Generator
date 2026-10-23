import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  ImageUp,
  Loader2,
  Plus,
  Shapes,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { BRANDS, svgUrl, type Brand } from '../lib/brand';
import { inkOn } from '../lib/color';
import { EMBEDDING_TEXT, readFontFile, type FontInfo } from '../lib/font-file';
import { softSpring, spring } from '../lib/motion';
import { useReduce } from '../lib/motion-pref';
import { ThemeSwitch } from '../lib/theme-pref';
import { navigate } from '../router';

// Structured entry (research note 2026-10-19, E7): identity, logo and the user's own variants, universe
// (text and documents), reference fonts. Everything but the logo is optional; sections open one after the
// other on a phone and sit next to a live cover preview on a wide screen.
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
const ROLES = [
  'Horizontale',
  'Verticale',
  'Symbole seul',
  'Monochrome noir',
  'Monochrome blanc',
  'Autre',
] as const;
// Open catalogue (OFL) known to the product: an exact name match is usable as is.
const OPEN_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Poppins',
  'Lato',
  'Open Sans',
  'Playfair Display',
  'Raleway',
  'Oswald',
  'Nunito',
  'Work Sans',
  'DM Sans',
  'DM Serif Display',
  'Space Grotesk',
  'Fraunces',
  'Bricolage Grotesque',
  'Manrope',
  'Sora',
  'Outfit',
  'Plus Jakarta Sans',
  'Libre Baskerville',
  'Merriweather',
  'Lora',
  'Bebas Neue',
  'Archivo',
  'IBM Plex Sans',
  'Rubik',
  'Karla',
  'Syne',
  'Unbounded',
  'Geist',
];
// Fonts bundled in the prototype, for a live preview of a typed name.
const BUNDLED: Record<string, string> = {
  'space grotesk': 'Space Grotesk Variable',
  fraunces: 'Fraunces Variable',
  'bricolage grotesque': 'Bricolage Grotesque Variable',
  'dm serif display': 'DM Serif Display',
  geist: 'Geist Variable',
};

interface Variant {
  name: string;
  url: string;
  role: (typeof ROLES)[number];
}
interface Doc {
  name: string;
  size: number;
}

export function Start() {
  const reduce = useReduce();
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [brief, setBrief] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontName, setFontName] = useState('');
  const [open, setOpen] = useState(0);
  const [sending, setSending] = useState(false);
  const brand = BRANDS.find((b) => b.slug === slug);

  const pickBrand = (b: Brand) => {
    setSlug(b.slug);
    if (brandName === '') setBrandName(b.name);
    if (brief === '') setBrief(b.brief);
  };
  const typedFont = OPEN_FONTS.find((f) => f.toLowerCase() === fontName.trim().toLowerCase());
  const previewFamily =
    fonts[0]?.cssFamily ??
    (typedFont ? BUNDLED[typedFont.toLowerCase()] : undefined) ??
    brand?.fonts.display ??
    'Bricolage Grotesque Variable';
  const go = () => {
    if (!slug) return;
    setSending(true);
    setTimeout(() => navigate(`/studio/${slug}`), reduce ? 0 : 650);
  };
  const done = [
    brandName !== '',
    slug !== null,
    brief !== '' || docs.length > 0,
    fonts.length > 0 || typedFont !== undefined,
  ];

  return (
    <div className="theme-studio min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-11 items-center gap-2 rounded-full px-3 text-sm text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Accueil
        </button>
        <span className="font-display text-lg font-bold tracking-tight">Charta</span>
        <ThemeSwitch />
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-28 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:pt-10">
        <div>
          <h1 className="m-0 font-display text-[clamp(34px,7vw,60px)] font-bold leading-[0.95] tracking-tight">
            Quelle marque on habille <span className="text-accent">aujourd'hui{' '}?</span>
          </h1>
          <p className="mt-3 max-w-xl text-ink-2">
            Seul le logo est obligatoire. Plus vous en dites, plus la charte vous ressemble.
          </p>

          <ol className="m-0 mt-8 list-none space-y-3 p-0">
            <Section
              index={0}
              open={open}
              setOpen={setOpen}
              done={done[0]!}
              icon={<Type className="h-4 w-4" />}
              title="Identité"
              hint="Nom de la marque, slogan"
            >
              <Field label="Nom de la marque" id="name">
                <input
                  id="name"
                  value={brandName}
                  maxLength={80}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex. : Ombre & Grain"
                  className={INPUT}
                />
              </Field>
              <Field label="Slogan (facultatif)" id="tagline">
                <input
                  id="tagline"
                  value={tagline}
                  maxLength={160}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ex. : Le café, lentement."
                  className={INPUT}
                />
              </Field>
            </Section>

            <Section
              index={1}
              open={open}
              setOpen={setOpen}
              done={done[1]!}
              icon={<Shapes className="h-4 w-4" />}
              title="Logo et variantes"
              hint="Le logo, et vos versions officielles si vous en avez"
            >
              <p className="m-0 mb-3 text-sm text-ink-2">
                Logo principal (choisissez un logo du corpus pour la démo)
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {BRANDS.map((b) => {
                  const chosen = b.slug === slug;
                  return (
                    <motion.button
                      key={b.slug}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      aria-pressed={chosen}
                      onClick={() => pickBrand(b)}
                      className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-[22px] border bg-elevated p-2 ${chosen ? 'border-accent' : 'border-line'}`}
                    >
                      <span className="grid h-3/5 w-4/5 place-items-center rounded-[16px] bg-white p-2">
                        <img src={svgUrl(b.logo)} alt="" className="h-full w-full object-contain" />
                      </span>
                      <span className="text-xs">{b.name}</span>
                      {chosen && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <VariantPicker variants={variants} setVariants={setVariants} />
            </Section>

            <Section
              index={2}
              open={open}
              setOpen={setOpen}
              done={done[2]!}
              icon={<FileText className="h-4 w-4" />}
              title="Univers"
              hint="Description, brief, documents"
            >
              <Field label="Décrivez la marque, son public, son ton" id="brief">
                <textarea
                  id="brief"
                  rows={4}
                  maxLength={8000}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Ex. : torréfaction de quartier, chaleureuse et lettrée…"
                  className={`${INPUT} h-auto min-h-28 resize-y py-3`}
                />
              </Field>
              <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
                {UNIVERSES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() =>
                      setBrief((b) => (b.includes(u) ? b : `${b}${b ? ' · ' : ''}${u}`))
                    }
                    className="h-10 shrink-0 rounded-full border border-line px-4 text-xs text-ink-2 hover:text-ink"
                  >
                    {u}
                  </button>
                ))}
              </div>
              <Drop
                label="Documents (PDF, DOCX, TXT · 3 maximum, 10 Mo chacun)"
                accept=".pdf,.docx,.txt"
                multiple
                onFiles={(files) =>
                  setDocs((d) =>
                    [...d, ...files.map((f) => ({ name: f.name, size: f.size }))].slice(0, 3),
                  )
                }
              />
              <ul className="m-0 mt-3 list-none space-y-2 p-0">
                {docs.map((d, i) => (
                  <li
                    key={`${d.name}${String(i)}`}
                    className="flex items-center gap-3 rounded-[16px] border border-line bg-canvas px-4 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4 text-ink-3" aria-hidden />
                    <span className="flex-1 truncate">{d.name}</span>
                    <span className="text-xs text-ink-3">
                      {(d.size / 1024 / 1024).toFixed(1)} Mo
                    </span>
                    <button
                      type="button"
                      aria-label={`Retirer ${d.name}`}
                      onClick={() => setDocs((all) => all.filter((_, k) => k !== i))}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-elevated"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              index={3}
              open={open}
              setOpen={setOpen}
              done={done[3]!}
              icon={<Type className="h-4 w-4" />}
              title="Polices de référence"
              hint="Vos fichiers de police, ou leur nom"
            >
              <Drop
                label="Fichier de police (TTF, OTF, WOFF, WOFF2) : lu sur votre appareil pour l'aperçu"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                onFiles={async (files) => {
                  setFontError(null);
                  for (const file of files) {
                    try {
                      const info = await readFontFile(file);
                      setFonts((all) => [...all, info]);
                    } catch {
                      setFontError(`${file.name} : fichier de police illisible.`);
                    }
                  }
                }}
              />
              {fontError && (
                <p role="alert" className="m-0 mt-2 text-sm text-danger">
                  {fontError}
                </p>
              )}
              <ul className="m-0 mt-3 list-none space-y-2 p-0">
                {fonts.map((f) => (
                  <FontCard key={f.cssFamily} font={f} sample={brandName || 'Votre marque'} />
                ))}
              </ul>
              <Field label="…ou le nom de la police" id="fontname">
                <input
                  id="fontname"
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  placeholder="Ex. : Fraunces, Montserrat, Futura…"
                  className={INPUT}
                />
              </Field>
              <AnimatePresence initial={false}>
                {fontName.trim().length > 2 && (
                  <motion.p
                    key={typedFont ? 'ok' : 'no'}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="m-0 flex items-start gap-2 rounded-[16px] border border-line bg-canvas p-3 text-sm"
                  >
                    {typedFont ? (
                      <>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        <span>
                          <strong>{typedFont}</strong> est une police libre (OFL) : utilisable telle
                          quelle dans la charte et les exports.
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                        <span>
                          Police hors du catalogue libre : déposez le fichier que vous possédez
                          (nous ne la téléchargeons pas pour vous, sa licence l'interdit souvent). À
                          défaut, la charte proposera les polices libres les plus proches de votre
                          logo.
                        </span>
                      </>
                    )}
                  </motion.p>
                )}
              </AnimatePresence>
            </Section>
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={!slug || sending}
              onClick={go}
              className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent px-8 text-base font-semibold text-on-accent disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : null}
              Générer la charte
              {!sending && <ArrowRight className="h-5 w-5" aria-hidden />}
            </motion.button>
            <span className="text-sm text-ink-3">
              {slug
                ? `${String(done.filter(Boolean).length)}/4 sections renseignées`
                : 'Choisissez au moins un logo'}
            </span>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Aperçu de la couverture">
          <CoverPreview
            brand={brand}
            name={brandName}
            tagline={tagline}
            family={previewFamily}
            variants={variants}
          />
        </aside>
      </main>
    </div>
  );
}

const INPUT =
  'h-12 w-full rounded-[16px] border border-line-strong bg-canvas px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-focus';

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm text-ink-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section(props: {
  index: number;
  open: number;
  setOpen: (i: number) => void;
  done: boolean;
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const expanded = props.open === props.index;
  return (
    <motion.li
      layout
      transition={softSpring}
      className="overflow-hidden rounded-[28px] border border-line bg-surface"
    >
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => props.setOpen(expanded ? -1 : props.index)}
          className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
        >
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${props.done ? 'bg-success text-canvas' : 'bg-elevated text-ink-2'}`}
          >
            {props.done ? <Check className="h-4 w-4" aria-hidden /> : props.icon}
          </span>
          <span className="flex-1">
            <span className="block text-base font-semibold">{props.title}</span>
            <span className="block text-xs text-ink-3">{props.hint}</span>
          </span>
          <ChevronDown
            className={`h-5 w-5 text-ink-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-5 sm:px-5"
          >
            {props.children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Drop({
  label,
  accept,
  multiple,
  onFiles,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void onFiles([...e.dataTransfer.files]);
      }}
      className={`flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed p-5 text-center transition-colors ${over ? 'border-accent bg-accent/10' : 'border-line-strong/60'}`}
    >
      <p className="m-0 text-sm text-ink-2">{label}</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm"
      >
        <ImageUp className="h-4 w-4" aria-hidden /> Choisir{' '}
        {multiple ? 'des fichiers' : 'un fichier'}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          void onFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function VariantPicker({
  variants,
  setVariants,
}: {
  variants: Variant[];
  setVariants: (update: (v: Variant[]) => Variant[]) => void;
}) {
  return (
    <div className="mt-5">
      <p className="m-0 mb-2 text-sm text-ink-2">
        Vos variantes officielles (facultatif) : elles passent avant les variantes générées.
      </p>
      <Drop
        label="Variantes du logo (SVG, PNG, JPEG, WebP)"
        accept=".svg,.png,.jpg,.jpeg,.webp"
        multiple
        onFiles={(files) =>
          setVariants((v) => [
            ...v,
            ...files.map((f) => ({
              name: f.name,
              url: URL.createObjectURL(f),
              role: 'Autre' as const,
            })),
          ])
        }
      />
      <ul className="m-0 mt-3 list-none space-y-3 p-0">
        {variants.map((variant, index) => (
          <li key={variant.url} className="rounded-[20px] border border-line bg-canvas p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[repeating-conic-gradient(#3a3a3a_0_25%,#2a2a2a_0_50%)] bg-[length:12px_12px] p-1.5">
                <img src={variant.url} alt="" className="h-full w-full object-contain" />
              </span>
              <span className="flex-1 truncate text-sm">{variant.name}</span>
              <button
                type="button"
                aria-label={`Retirer ${variant.name}`}
                onClick={() => setVariants((all) => all.filter((_, k) => k !== index))}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              role="radiogroup"
              aria-label={`Rôle de ${variant.name}`}
              className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto"
            >
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="radio"
                  aria-checked={variant.role === role}
                  onClick={() =>
                    setVariants((all) => all.map((v, k) => (k === index ? { ...v, role } : v)))
                  }
                  className={`h-9 shrink-0 rounded-full border px-3 text-xs ${variant.role === role ? 'border-accent bg-accent/15 text-ink' : 'border-line text-ink-2'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FontCard({ font, sample }: { font: FontInfo; sample: string }) {
  const verdict = EMBEDDING_TEXT[font.embedding];
  const toneClass =
    verdict.tone === 'ok'
      ? 'text-success'
      : verdict.tone === 'mid'
        ? 'text-warning'
        : 'text-danger';
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className="rounded-[20px] border border-line bg-canvas p-4"
    >
      <p className="m-0 truncate text-3xl leading-tight" style={{ fontFamily: font.cssFamily }}>
        {sample}
      </p>
      <p className="m-0 mt-2 text-sm">
        <strong>{font.family}</strong> {font.style}
        {font.glyphs > 0 ? ` · ${String(font.glyphs)} glyphes` : ''}
        {font.designer ? ` · ${font.designer}` : ''}
      </p>
      <p className={`m-0 mt-2 flex items-start gap-2 text-sm ${toneClass}`}>
        {verdict.tone === 'bad' ? (
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>
          <strong>{verdict.label}</strong> <span className="text-ink-2">— {verdict.detail}</span>
        </span>
      </p>
      {font.license && (
        <p className="m-0 mt-2 line-clamp-2 text-xs text-ink-3">Licence : {font.license}</p>
      )}
    </motion.li>
  );
}

function CoverPreview({
  brand,
  name,
  tagline,
  family,
  variants,
}: {
  brand: Brand | undefined;
  name: string;
  tagline: string;
  family: string;
  variants: Variant[];
}) {
  const bg = brand?.roles.primary.hex ?? '#24262c';
  const ink = inkOn(bg);
  const logo = brand ? (ink === '#FFFFFF' ? brand.mono.white : brand.mono.black) : null;
  return (
    <div>
      <p className="m-0 mb-3 text-sm text-ink-3">Aperçu de la couverture</p>
      {/* Mirrors the form (name, slogan, logo): hidden from assistive tech, which already reads the fields.
          axe misreads its animated background as the page canvas, hence data-decorative (scripts/gates.mjs). */}
      <motion.div
        aria-hidden
        data-decorative
        className="@container relative aspect-[210/297] w-full overflow-hidden rounded-[28px] shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)]"
        initial={false}
        animate={{ backgroundColor: bg }}
        transition={{ duration: 0.6 }}
        style={{ background: bg, color: ink }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-[8cqw]">
          <span className="text-[2.6cqw] uppercase tracking-[0.14em] opacity-75">
            Charte graphique · 2026
          </span>
          <AnimatePresence mode="wait">
            {logo ? (
              <motion.img
                key={brand?.slug}
                src={svgUrl(logo)}
                alt=""
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={softSpring}
                className="mx-auto h-[34cqw] w-[56cqw] object-contain"
              />
            ) : (
              <span className="mx-auto grid h-[34cqw] w-[56cqw] place-items-center rounded-[4cqw] border-2 border-dashed border-current/30 opacity-60">
                <Plus className="h-[6cqw] w-[6cqw]" aria-hidden />
              </span>
            )}
          </AnimatePresence>
          <div>
            <p
              className="m-0 break-words text-[11cqw] font-semibold leading-[0.9] tracking-tight"
              style={{ fontFamily: family }}
            >
              {name || 'Votre marque'}
            </p>
            <p className="m-0 mt-[2cqw] text-[3.6cqw] opacity-85" style={{ fontFamily: family }}>
              {tagline || 'Votre slogan'}
            </p>
          </div>
        </div>
      </motion.div>
      {variants.length > 0 && (
        <div className="mt-3 flex gap-2">
          {variants.slice(0, 5).map((v) => (
            <span
              key={v.url}
              className="grid h-14 w-14 place-items-center rounded-[14px] border border-line bg-white p-1.5"
              title={v.role}
            >
              <img src={v.url} alt={v.role} className="h-full w-full object-contain" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
