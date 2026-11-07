import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Palette,
  Layers,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Play,
  Moon,
  Sun,
  LayoutGrid
} from 'lucide-react';
import { BRANDS, svgUrl, REALISTIC_SCENES } from '../lib/brandData';
import { photoOf } from '../lib/photos';

interface LandingProps {
  onNavigate: (screen: 'landing' | 'auth' | 'dashboard' | 'studio', slug?: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Landing({ onNavigate, theme, onToggleTheme }: LandingProps) {
  const [activeBrand, setActiveBrand] = useState(BRANDS[0]!);
  const [activeScene, setActiveScene] = useState('cards');

  const photo = photoOf(activeBrand.slug, activeScene);

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent/20">
      {/* 1. Pill Navigation Bar */}
      <header className="sticky top-4 z-50 max-w-6xl mx-auto px-4">
        <nav className="bg-surface/85 backdrop-blur-md border border-line rounded-full px-5 py-3 flex items-center justify-between shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-ink"
            >
              <div className="w-8 h-8 rounded-xl bg-ink text-surface flex items-center justify-center font-mono font-black text-sm shadow-sm">
                C
              </div>
              <span>Charta</span>
            </button>
            <span className="hidden sm:inline-flex text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
              Mode GDG Fest
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-2">
            <a href="#demo" className="hover:text-ink transition-colors">Démo Interactive</a>
            <a href="#features" className="hover:text-ink transition-colors">Architecture Déterministe</a>
            <a href="#mockups" className="hover:text-ink transition-colors">Mockups 4K</a>
            <button
              onClick={() => onNavigate('dashboard')}
              className="hover:text-ink transition-colors flex items-center gap-1.5"
            >
              <LayoutGrid className="w-4 h-4 text-accent" />
              <span>Dashboard Projets</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-line text-ink-2 hover:text-ink hover:bg-elevated transition-colors"
              title="Changer de thème"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onNavigate('auth')}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-ink hover:text-accent transition-colors"
            >
              Connexion
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2 rounded-full bg-ink text-surface text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-ink/10 flex items-center gap-2"
            >
              <span>Lancer le Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 px-4 overflow-hidden">
        {/* Subtle mesh background blur */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-amber-400/15 via-rose-400/10 to-indigo-400/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line text-xs font-medium text-ink-2 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Génération en direct • Plans de travail Illustrator • Zéro hallucination</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight text-ink max-w-4xl mx-auto leading-[1.08]">
            Déposez votre logo. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-amber-600 to-indigo-600">
              Votre charte graphique s'anime en direct.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Fini les PDF statiques et les semaines d'attente. Charta calcule vos palettes mathématiques, vos ratios de contrastes WCAG 2.2 AA, vos variantes de logo et projette vos mockups sur plans de travail A4.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-ink text-surface font-semibold text-base shadow-xl shadow-ink/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Accéder à mes projets</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('studio', activeBrand.slug)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-surface border border-line text-ink font-semibold text-base hover:bg-elevated transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-emerald-600" />
              <span>Tester en direct avec {activeBrand.name}</span>
            </button>
          </div>
        </div>

        {/* 3. Interactive Hero Showcase (Constellation & Live Cards) */}
        <div id="demo" className="mt-14 max-w-6xl mx-auto">
          {/* Brand Switcher Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3 mr-2">Essayer un logo :</span>
            {BRANDS.slice(0, 5).map((b) => (
              <button
                key={b.slug}
                onClick={() => setActiveBrand(b)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border ${
                  activeBrand.slug === b.slug
                    ? 'bg-ink text-surface border-ink shadow-sm'
                    : 'bg-surface text-ink-2 border-line hover:border-ink/30'
                }`}
              >
                <img src={svgUrl(b.logo)} alt={b.name} className="w-4 h-4 object-contain filter invert-0" />
                <span>{b.name}</span>
              </button>
            ))}
          </div>

          {/* Interactive Workspace Preview */}
          <div className="relative rounded-3xl bg-surface/70 border border-line p-4 sm:p-8 backdrop-blur-xl shadow-2xl bg-blueprint">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Live Palette & Tokens Card (Pinterest 01 Neo-brutalism inspired) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-surface border-2 border-line-strong rounded-2xl p-5 shadow-brutal">
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">Palette Extraite</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      WCAG AA
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {activeBrand.extracted.slice(0, 4).map((c, i) => (
                      <div key={i} className="text-center">
                        <div
                          className="h-12 rounded-xl border border-line shadow-sm mb-1.5 transition-transform hover:scale-105"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="font-mono text-[10px] text-ink-2 block truncate">{c.hex}</span>
                        <span className="font-mono text-[9px] text-ink-3 block">{(c.share * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-2">
                    <span>Ratio de contraste max :</span>
                    <span className="font-mono font-bold text-ink">
                      {activeBrand.contrast[0]?.ratio.toFixed(1)}:1 (Pass)
                    </span>
                  </div>
                </div>

                {/* Tokens Card */}
                <div className="bg-surface border border-line rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-mono text-ink-3 mb-2">
                    <span>tokens.json</span>
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <pre className="font-mono text-[11px] text-ink-2 bg-elevated/60 p-2.5 rounded-xl overflow-x-auto">
                    {`{\n  "--color-primary": "${activeBrand.roles.primary.hex}",\n  "--color-accent": "${activeBrand.roles.accent.hex}",\n  "--font-heading": "${activeBrand.fonts.display}"\n}`}
                  </pre>
                </div>
              </div>

              {/* Center: Live Artboard Mockup Canvas */}
              <div className="lg:col-span-8">
                <div className="bg-elevated/80 border border-line rounded-2xl p-4 shadow-artboard relative group">
                  <div className="flex items-center justify-between mb-3 text-xs text-ink-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-bold text-ink">Plan de travail A4 • Scène Réaliste</span>
                    </div>
                    {/* Scene switcher */}
                    <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line">
                      {REALISTIC_SCENES.slice(0, 4).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setActiveScene(s.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            activeScene === s.id
                              ? 'bg-ink text-surface'
                              : 'text-ink-2 hover:text-ink'
                          }`}
                        >
                          {s.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="aspect-[16/10] bg-surface rounded-xl overflow-hidden relative flex items-center justify-center border border-line">
                    {photo ? (
                      <img
                        src={photo}
                        alt={`${activeBrand.name} ${activeScene}`}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <img
                          src={svgUrl(activeBrand.logo)}
                          alt={activeBrand.name}
                          className="w-32 h-32 mx-auto object-contain mb-4"
                        />
                        <span className="font-display font-bold text-lg text-ink block">{activeBrand.name}</span>
                        <span className="text-xs text-ink-3">Aperçu vectoriel déterministe</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-line shadow-md text-xs font-mono font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-accent" />
                      <span>Homographie exacte 4K</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-ink-2">
                    <span>Modèle : {activeBrand.name} ({activeBrand.sector})</span>
                    <button
                      onClick={() => onNavigate('studio', activeBrand.slug)}
                      className="font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <span>Ouvrir dans l'Atelier Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Three Pillars Section (Inspired by Pinterest Ref 01 & 04) */}
      <section id="features" className="py-20 px-4 border-t border-line bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
              L'Exactitude Mathématique d'abord.
            </h2>
            <p className="mt-3 text-ink-2 text-base">
              Pas d'images floues générées au hasard. Charta respecte 3 principes non négociables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-surface border-2 border-line-strong rounded-3xl p-7 shadow-brutal flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-line-strong flex items-center justify-center mb-6 shadow-brutal-sm">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink">1. Le Logo est Sacré</h3>
                <p className="mt-3 text-sm text-ink-2 leading-relaxed">
                  Votre logo vectoriel n'est jamais redessiné ni altéré par une IA. Les variantes monochromes, zones de sécurité et formats sont rigoureusement calculés.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line text-xs font-mono font-bold text-ink">
                ✓ Tracé SVG original préservé
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-surface border-2 border-line-strong rounded-3xl p-7 shadow-brutal flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 border-2 border-line-strong flex items-center justify-center mb-6 shadow-brutal-sm">
                  <Palette className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink">2. Couleurs & Contrastes APCA</h3>
                <p className="mt-3 text-sm text-ink-2 leading-relaxed">
                  Extraction dans l'espace perceptuel OKLCH, génération des gammes claires/sombres et matrice complète de conformité aux normes d'accessibilité WCAG 2.2 AA.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line text-xs font-mono font-bold text-ink">
                ✓ Matrice de lisibilité en direct
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-surface border-2 border-line-strong rounded-3xl p-7 shadow-brutal flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-400/20 border-2 border-line-strong flex items-center justify-center mb-6 shadow-brutal-sm">
                  <FileCode className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink">3. Sortie Développeur & Print</h3>
                <p className="mt-3 text-sm text-ink-2 leading-relaxed">
                  Export en un clic d'un livre de marque PDF haute fidélité, des fichiers SVG assainis et d'un package `tokens.json` prêt pour Tailwind CSS v4.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line text-xs font-mono font-bold text-ink">
                ✓ Zéro ressaisie technique
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Big CTA Banner */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl bg-ink text-surface p-10 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display font-bold text-3xl sm:text-5xl tracking-tight">
              Prêt à générer votre identité de marque ?
            </h2>
            <p className="mt-4 text-surface/75 text-base sm:text-lg max-w-xl mx-auto">
              Rejoignez le Studio dès maintenant. Importez votre fichier ou explorez les marques de démonstration sans friction.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-8 py-4 rounded-2xl bg-surface text-ink font-bold text-base hover:bg-surface/90 shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Accéder au Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-10 px-4 text-center text-xs text-ink-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-ink">
            <div className="w-5 h-5 rounded bg-ink text-surface flex items-center justify-center text-xs">C</div>
            <span>Charta Studio</span>
          </div>
          <p>© 2026 Charta • Projet GDG Fest • Architecture Déterministe & Moteur Graphique</p>
          <div className="flex items-center gap-4 text-ink-2">
            <button onClick={() => onNavigate('dashboard')} className="hover:underline">Dashboard</button>
            <button onClick={() => onNavigate('auth')} className="hover:underline">Connexion</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
