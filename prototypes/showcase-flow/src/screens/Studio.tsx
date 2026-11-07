import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Sparkles,
  Layers,
  Palette,
  Type,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Send,
  Eye,
  RotateCw,
  Sliders,
  Check,
  Share2,
  FileCode,
  Smartphone,
  CreditCard,
  Store,
  ShoppingBag,
  Building2
} from 'lucide-react';
import { BRANDS, svgUrl, REALISTIC_SCENES, Brand } from '../lib/brandData';
import { photoOf } from '../lib/photos';
import { ExportModal } from '../components/ExportModal';

interface StudioProps {
  slug?: string;
  onNavigate: (screen: 'landing' | 'auth' | 'dashboard' | 'studio', slug?: string) => void;
  theme: 'light' | 'dark';
}

export function Studio({ slug = 'instacart', onNavigate, theme }: StudioProps) {
  const [currentBrand, setCurrentBrand] = useState<Brand>(
    () => BRANDS.find((b) => b.slug === slug) ?? BRANDS[0]!
  );

  // Canvas zoom & view states
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedArtboard, setSelectedArtboard] = useState<number>(1);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [activeMockupScene, setActiveMockupScene] = useState<string>('cards');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Copilot chat state
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Bonjour ! J'ai extrait la palette de ${currentBrand.name} et composé les 6 plans de travail A4. Les ratios de contrastes WCAG 2.2 AA sont validés.`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [historyCount, setHistoryCount] = useState<number>(0);

  // Inspector color override state
  const [overridePrimary, setOverridePrimary] = useState<string>(currentBrand.roles.primary.hex);
  const [overrideAccent, setOverrideAccent] = useState<string>(currentBrand.roles.accent.hex);

  const handleSendPrompt = (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInputPrompt('');
    setHistoryCount((c) => c + 1);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Modification appliquée avec succès : ajustement des contrastes et réévaluation des tokens sur le plan ${selectedArtboard}.`
        }
      ]);
    }, 700);
  };

  const currentPhoto = photoOf(currentBrand.slug, activeMockupScene);

  return (
    <div className="h-screen w-screen bg-canvas text-ink flex flex-col overflow-hidden">
      {/* 1. Top Navigation Bar (Illustrator Style Toolbar) */}
      <header className="h-14 border-b border-line bg-surface px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back to Dashboard & Project Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink-2 hover:text-ink hover:bg-elevated transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-5 w-px bg-line" />

          {/* Brand Switcher in Top Bar */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-elevated border border-line p-1 flex items-center justify-center">
              <img src={svgUrl(currentBrand.logo)} alt={currentBrand.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display font-bold text-xs text-ink block leading-none">
                {currentBrand.name}
              </span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>6 Plans A4 prêts</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Canvas View Controls (Zoom, Orientation, Undo/Redo) */}
        <div className="hidden md:flex items-center gap-2 bg-elevated/70 border border-line rounded-xl px-2 py-1">
          {/* Undo / Redo */}
          <button
            onClick={() => {
              if (historyCount > 0) setHistoryCount((c) => c - 1);
            }}
            disabled={historyCount === 0}
            className="p-1 rounded text-ink-2 hover:text-ink disabled:opacity-30"
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setHistoryCount((c) => c + 1)}
            className="p-1 rounded text-ink-2 hover:text-ink"
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-line" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
            className="p-1 rounded text-ink-2 hover:text-ink"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-bold px-1 w-10 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
            className="p-1 rounded text-ink-2 hover:text-ink"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoomLevel(100)}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-ink-2 hover:text-ink hover:bg-surface"
            title="Adapter à l'écran"
          >
            100%
          </button>

          <div className="h-3.5 w-px bg-line" />

          {/* Orientation switch */}
          <button
            onClick={() => setOrientation((o) => (o === 'landscape' ? 'portrait' : 'landscape'))}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-ink font-semibold flex items-center gap-1 hover:bg-surface"
          >
            <RotateCw className="w-3 h-3" />
            <span>{orientation === 'landscape' ? 'A4 Paysage' : 'A4 Portrait'}</span>
          </button>
        </div>

        {/* Right: Export CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExportOpen(true)}
            className="px-4 py-2 rounded-xl bg-ink text-surface text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter la Charte</span>
          </button>
        </div>
      </header>

      {/* 2. Three-Column Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Pipeline SSE & Copilot Chat (Pinterest Ref 05 inspired) */}
        <aside className="w-80 bg-surface border-r border-line flex flex-col justify-between shrink-0 z-10">
          {/* Upper: Generation Pipeline Nodes */}
          <div className="p-4 border-b border-line overflow-y-auto max-h-56">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-ink-3 block mb-3">
              Pipeline Déterministe en Direct
            </span>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-ink block">Extraction du Logo</span>
                  <span className="text-[10px] text-emerald-600 font-mono">100% vectoriel préservé</span>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-ink block">Palettes & Ratios WCAG</span>
                  <span className="text-[10px] text-emerald-600 font-mono">APCA Conforme AA</span>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-ink block">Récit de Marque Gemini</span>
                  <span className="text-[10px] text-emerald-600 font-mono">6 piliers générés</span>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-bold text-ink block">Projection Homographique</span>
                  <span className="text-[10px] text-emerald-600 font-mono">Scènes 4K calculées</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Copilot Chat & Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-ink-3 block">
              Copilote Graphique
            </span>

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs ${
                  m.sender === 'user'
                    ? 'bg-ink text-surface ml-4 rounded-tr-xs'
                    : 'bg-elevated border border-line text-ink mr-4 rounded-tl-xs'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Bottom: Quick prompt chips & Input */}
          <div className="p-3 border-t border-line bg-surface/50">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => handleSendPrompt('Rendre la palette plus lumineuse')}
                className="whitespace-nowrap px-2 py-1 rounded-lg text-[10px] font-semibold bg-elevated hover:bg-elevated/80 border border-line text-ink-2"
              >
                ✨ Palette lumineuse
              </button>
              <button
                onClick={() => handleSendPrompt('Changer pour Bricolage Grotesque')}
                className="whitespace-nowrap px-2 py-1 rounded-lg text-[10px] font-semibold bg-elevated hover:bg-elevated/80 border border-line text-ink-2"
              >
                🔤 Typo Bricolage
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-1.5 mt-1"
            >
              <input
                type="text"
                placeholder="Consigne en langage naturel..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-line bg-canvas text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-ink text-surface hover:opacity-90 transition-opacity"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </aside>

        {/* CENTER COLUMN: Infinite Illustrator Artboards Canvas */}
        <main className="flex-1 bg-blueprint overflow-auto p-12 flex justify-center items-start">
          <div
            className="transition-transform duration-200 origin-top flex flex-col items-center gap-14"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Row of Artboards Navigation Indicator */}
            <div className="flex items-center gap-3 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-line shadow-md text-xs font-mono font-bold">
              <span>Sélection active : Plan {selectedArtboard} / 6</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedArtboard(num)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedArtboard === num ? 'bg-ink text-surface' : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* ARTBOARD GRID (A4 Landscape 16:9 / 297x210 ratio) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 max-w-7xl">
              {/* PLAN 1 : COUVERTURE ÉDITORIALE */}
              <div
                onClick={() => setSelectedArtboard(1)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-8 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 1 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 1 • Couverture de Charte
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ink" />
                    <span className="font-mono text-xs font-bold tracking-wider uppercase">LIVRE DE MARQUE</span>
                  </div>
                  <span className="font-mono text-xs text-ink-3">2026 EDITION</span>
                </div>

                <div className="my-auto">
                  <div className="w-20 h-20 mb-4">
                    <img src={svgUrl(currentBrand.logo)} alt={currentBrand.name} className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-display font-black text-4xl text-ink tracking-tight">
                    {currentBrand.name}
                  </h2>
                  <p className="text-sm text-ink-2 mt-1">
                    Spécifications et Système d'Identité Visuelle • {currentBrand.sector}
                  </p>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {currentBrand.extracted.slice(0, 4).map((c, i) => (
                      <span key={i} className="w-5 h-5 rounded-full border border-line" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-ink-3">DOCUMENT DE RÉFÉRENCE V4.1</span>
                </div>
              </div>

              {/* PLAN 2 : SYSTÈME DE LOGO & VARIANTES */}
              <div
                onClick={() => setSelectedArtboard(2)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-8 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 2 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 2 • Système de Logo & Variantes
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="font-mono text-xs font-bold uppercase">Variantes & Exclusion</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                    Tracé Intact
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 my-auto">
                  {/* Master Logo */}
                  <div className="border border-line rounded-xl p-3 text-center bg-canvas/40">
                    <div className="h-16 flex items-center justify-center mb-2">
                      <img src={svgUrl(currentBrand.logo)} alt="Logo Couleur" className="max-h-12 object-contain" />
                    </div>
                    <span className="font-mono text-[10px] font-bold block text-ink">Logo Principal</span>
                  </div>

                  {/* Monochrome Black */}
                  <div className="border border-line rounded-xl p-3 text-center bg-canvas/40">
                    <div className="h-16 flex items-center justify-center mb-2">
                      <img
                        src={svgUrl(currentBrand.mono.black || currentBrand.logo)}
                        alt="Logo Noir"
                        className="max-h-12 object-contain filter brightness-0"
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold block text-ink">Mono Noir</span>
                  </div>

                  {/* Monochrome White */}
                  <div className="border border-line rounded-xl p-3 text-center bg-ink">
                    <div className="h-16 flex items-center justify-center mb-2">
                      <img
                        src={svgUrl(currentBrand.mono.white || currentBrand.logo)}
                        alt="Logo Blanc"
                        className="max-h-12 object-contain filter brightness-0 invert"
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold block text-surface">Mono Blanc</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-2">
                  <span>Zone de sécurité : 1/2 hauteur du symbole</span>
                  <span className="font-mono font-bold text-ink">Favicon SVG inclus</span>
                </div>
              </div>

              {/* PLAN 3 : PALETTE & CONTRASTES APCA (Pinterest Ref 01 & 04) */}
              <div
                onClick={() => setSelectedArtboard(3)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-8 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 3 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 3 • Palette & Contrastes WCAG
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="font-mono text-xs font-bold uppercase">Palette Chromatique Mathématique</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                    WCAG 2.2 AA
                  </span>
                </div>

                {/* 4 Roles Swatches */}
                <div className="grid grid-cols-4 gap-3 my-auto">
                  <div className="bg-canvas border border-line rounded-xl p-2.5 text-center">
                    <div className="h-12 rounded-lg mb-2 shadow-xs" style={{ backgroundColor: overridePrimary }} />
                    <span className="font-bold text-[11px] block text-ink">Primaire</span>
                    <span className="font-mono text-[10px] text-ink-3 block">{overridePrimary}</span>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5 text-center">
                    <div className="h-12 rounded-lg mb-2 shadow-xs" style={{ backgroundColor: overrideAccent }} />
                    <span className="font-bold text-[11px] block text-ink">Accent</span>
                    <span className="font-mono text-[10px] text-ink-3 block">{overrideAccent}</span>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5 text-center">
                    <div
                      className="h-12 rounded-lg mb-2 shadow-xs"
                      style={{ backgroundColor: currentBrand.roles.neutralDark.hex }}
                    />
                    <span className="font-bold text-[11px] block text-ink">Neutre Sombre</span>
                    <span className="font-mono text-[10px] text-ink-3 block">{currentBrand.roles.neutralDark.hex}</span>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5 text-center">
                    <div
                      className="h-12 rounded-lg mb-2 shadow-xs"
                      style={{ backgroundColor: currentBrand.roles.neutralLight.hex }}
                    />
                    <span className="font-bold text-[11px] block text-ink">Neutre Clair</span>
                    <span className="font-mono text-[10px] text-ink-3 block">{currentBrand.roles.neutralLight.hex}</span>
                  </div>
                </div>

                {/* Contrast Scores */}
                <div className="pt-3 border-t border-line grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2">Texte sur fond sombre :</span>
                    <span className="font-mono font-bold text-emerald-600">8.4:1 (Pass AAA)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-2">Bouton sur fond clair :</span>
                    <span className="font-mono font-bold text-emerald-600">5.2:1 (Pass AA)</span>
                  </div>
                </div>
              </div>

              {/* PLAN 4 : TYPOGRAPHIE & HIÉRARCHIE */}
              <div
                onClick={() => setSelectedArtboard(4)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-8 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 4 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 4 • Typographie & Hiérarchie
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <span className="font-mono text-xs font-bold uppercase">Couple Typographique</span>
                  <span className="text-[10px] font-mono text-ink-3">Open Font License</span>
                </div>

                <div className="my-auto space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-ink-3 block">TITRAGE (DISPLAY)</span>
                    <h3 className="font-display font-black text-2xl text-ink">
                      {currentBrand.fonts.display}
                    </h3>
                    <p className="font-display text-xs text-ink-2 mt-0.5 tracking-wider">
                      Aa Bb Cc Dd Ee Ff Gg 1234567890
                    </p>
                  </div>

                  <div className="pt-3 border-t border-line">
                    <span className="text-[10px] font-mono uppercase text-ink-3 block">CORPS DE TEXTE (BODY)</span>
                    <h4 className="font-sans font-bold text-base text-ink">
                      {currentBrand.fonts.text}
                    </h4>
                    <p className="font-sans text-xs text-ink-2 mt-1 leading-relaxed">
                      Conçu pour une clarté de lecture optimale sur tous les supports numériques et print.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-3 font-mono">
                  <span>Échelle modulaire : 1.25 (Major Third)</span>
                  <span>Interlignage calibré 140%</span>
                </div>
              </div>

              {/* PLAN 5 : RÉCIT DE MARQUE & 6 BLOCS (Directement inspiré de Pinterest Ref 07 !) */}
              <div
                onClick={() => setSelectedArtboard(5)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-7 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 5 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 5 • Piliers de Marque (Canvas 6 Blocs)
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-mono text-xs font-bold uppercase">Récit & Positionnement Gemini</span>
                  <span className="text-[10px] font-mono text-ink-3">Généré selon le brief</span>
                </div>

                {/* 6 Structured Modular Tiles */}
                <div className="grid grid-cols-3 gap-2.5 my-auto">
                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">Vision</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      Démocratiser l'excellence du design de marque pour chaque créateur.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">Why ?</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      Parce qu'une identité visuelle négligée détruit la confiance client.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">What ?</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      Un moteur déterministe qui calcule, assemble et livre en quelques minutes.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">How ?</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      La science des contrastes mathématiques associée au bon sens design.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">Mission</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      Donner à {currentBrand.name} l'envergure d'un studio d'élite.
                    </p>
                  </div>

                  <div className="bg-canvas border border-line rounded-xl p-2.5">
                    <span className="font-display font-bold text-[11px] block text-ink">Values</span>
                    <p className="text-[10px] text-ink-2 mt-0.5 line-clamp-3 leading-snug">
                      Fidélité au logo, accessibilité absolue, sobriété logicielle.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
                  <span>Ton : Précis, Moderne & Bienveillant</span>
                  <span className="font-mono">Archétype : L'Artisan Technologique</span>
                </div>
              </div>

              {/* PLAN 6 : MOCKUPS 4K RÉALISTES */}
              <div
                onClick={() => setSelectedArtboard(6)}
                className={`relative w-[560px] aspect-[16/10] bg-surface rounded-2xl p-6 border-2 shadow-artboard cursor-pointer transition-all flex flex-col justify-between ${
                  selectedArtboard === 6 ? 'border-ink ring-4 ring-ink/10' : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="absolute -top-6 left-0 text-[11px] font-mono font-bold uppercase text-ink-3">
                  Plan 6 • Scènes de Vie Photoréalistes
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-mono text-xs font-bold uppercase">Projection Homographique</span>
                  {/* Scene selector */}
                  <div className="flex items-center gap-1 bg-elevated p-0.5 rounded-lg border border-line">
                    {REALISTIC_SCENES.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMockupScene(s.id);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          activeMockupScene === s.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-3'
                        }`}
                      >
                        {s.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mockup Canvas */}
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-elevated relative flex items-center justify-center my-auto border border-line">
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt={activeMockupScene}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-6 text-center">
                      <img
                        src={svgUrl(currentBrand.logo)}
                        alt={currentBrand.name}
                        className="w-20 h-20 mx-auto object-contain mb-2"
                      />
                      <span className="font-mono text-xs text-ink-3">Projection 3D</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 bg-surface/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-ink shadow-xs">
                    {REALISTIC_SCENES.find((s) => s.id === activeMockupScene)?.label}
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
                  <span>Surface 100% calculée sans déformation</span>
                  <span className="font-mono text-emerald-600 font-bold">4K Prêt</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN: Contextual Inspector */}
        <aside className="w-72 bg-surface border-l border-line p-5 flex flex-col justify-between shrink-0 z-10 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <span className="font-mono text-xs font-bold uppercase text-ink">Inspecteur</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-bold">
                Plan {selectedArtboard}
              </span>
            </div>

            {/* Color Customizer */}
            <div className="mt-5 space-y-4">
              <span className="text-xs font-bold text-ink block">Couleurs de la Marque</span>

              <div>
                <label className="text-[11px] text-ink-2 block mb-1">Couleur Principale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overridePrimary}
                    onChange={(e) => setOverridePrimary(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line cursor-pointer"
                  />
                  <input
                    type="text"
                    value={overridePrimary}
                    onChange={(e) => setOverridePrimary(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-line bg-canvas font-mono text-xs text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-ink-2 block mb-1">Couleur d'Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line cursor-pointer"
                  />
                  <input
                    type="text"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-line bg-canvas font-mono text-xs text-ink"
                  />
                </div>
              </div>
            </div>

            {/* Typography Pairing */}
            <div className="mt-6 pt-5 border-t border-line space-y-3">
              <span className="text-xs font-bold text-ink block">Typographies Associées</span>
              <div className="bg-canvas border border-line rounded-xl p-3">
                <span className="text-[10px] font-mono text-ink-3 block">Display</span>
                <span className="font-display font-bold text-xs text-ink block truncate">
                  {currentBrand.fonts.display}
                </span>
                <span className="text-[10px] font-mono text-ink-3 block mt-2">Body</span>
                <span className="font-sans text-xs text-ink block truncate">
                  {currentBrand.fonts.text}
                </span>
              </div>
            </div>

            {/* Mockup Scenes list */}
            <div className="mt-6 pt-5 border-t border-line space-y-2">
              <span className="text-xs font-bold text-ink block">Scènes Photoréalistes</span>
              <div className="space-y-1">
                {REALISTIC_SCENES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveMockupScene(s.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      activeMockupScene === s.id
                        ? 'bg-ink text-surface font-semibold'
                        : 'text-ink-2 hover:bg-elevated'
                    }`}
                  >
                    <span>{s.label}</span>
                    {activeMockupScene === s.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <button
              onClick={() => setIsExportOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-ink text-surface text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Tout (PDF / Tokens)</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        brand={currentBrand}
      />
    </div>
  );
}
