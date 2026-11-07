import React, { useState } from 'react';
import {
  Plus,
  FolderKanban,
  FileCode,
  Layers,
  Sparkles,
  LogOut,
  Moon,
  Sun,
  Search,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  Palette,
  ExternalLink,
  ChevronRight,
  Trash2,
  Copy
} from 'lucide-react';
import { BRANDS, svgUrl, INITIAL_USER_PROJECTS, UserProject } from '../lib/brandData';

interface DashboardProps {
  onNavigate: (screen: 'landing' | 'auth' | 'dashboard' | 'studio', slug?: string) => void;
  onOpenNewProject: () => void;
  userEmail: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Dashboard({
  onNavigate,
  onOpenNewProject,
  userEmail,
  theme,
  onToggleTheme
}: DashboardProps) {
  const [projects, setProjects] = useState<UserProject[]>(INITIAL_USER_PROJECTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'tokens' | 'mockups'>('projects');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col md:flex-row">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-surface px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Collapsible Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-r border-line p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center justify-between pb-6 border-b border-line">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 font-display font-bold text-lg text-ink"
            >
              <div className="w-8 h-8 rounded-xl bg-ink text-surface flex items-center justify-center font-mono font-black text-sm">
                C
              </div>
              <span>Charta</span>
            </button>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
              Studio
            </span>
          </div>

          {/* Quick New Project Button in Sidebar */}
          <div className="mt-5">
            <button
              onClick={onOpenNewProject}
              className="w-full py-2.5 px-3 rounded-xl bg-ink text-surface font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Projet</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 space-y-1">
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'projects'
                  ? 'bg-elevated text-ink'
                  : 'text-ink-2 hover:text-ink hover:bg-elevated/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-emerald-600" />
                <span>Mes Projets</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-line">
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tokens');
                showToast('Export de tokens globaux prêt');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'tokens'
                  ? 'bg-elevated text-ink'
                  : 'text-ink-2 hover:text-ink hover:bg-elevated/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Tokens de Design</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent">JSON</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('mockups');
                showToast('Galerie 6 scènes photo 4K');
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'mockups'
                  ? 'bg-elevated text-ink'
                  : 'text-ink-2 hover:text-ink hover:bg-elevated/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Scènes Mockups 4K</span>
              </div>
              <span className="text-[10px] font-mono text-ink-3">6 scènes</span>
            </button>
          </nav>
        </div>

        {/* User Profile Card & Actions */}
        <div className="pt-6 border-t border-line space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-ink-3 uppercase">Apparence</span>
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg border border-line text-ink-2 hover:text-ink hover:bg-elevated transition-colors"
              title="Changer de thème"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-xl bg-elevated/50 border border-line">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {userEmail.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-ink truncate">
                {userEmail.split('@')[0]}
              </span>
              <span className="block text-[10px] text-ink-3 truncate">{userEmail}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('landing')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Dashboard Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-line">
          <div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-ink tracking-tight">
              Tableau de bord
            </h1>
            <p className="mt-1 text-xs md:text-sm text-ink-2">
              Visualisez et pilotez vos identités graphiques sur plans de travail Illustrator.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Rechercher une marque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-line bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* HERO CTA : LE GROS BOUTON NOUVEAU PROJET */}
        <div className="mt-8 relative rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white p-6 md:p-8 overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-block text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold mb-3">
                Génération en direct 3.8
              </span>
              <h2 className="font-display font-black text-2xl md:text-3xl leading-tight">
                Créer une nouvelle charte graphique
              </h2>
              <p className="mt-2 text-xs md:text-sm text-white/80">
                Déposez simplement un logo (SVG ou PNG). Notre moteur extrait la palette, calcule les contrastes et compose 6 plans de travail en quelques minutes.
              </p>
            </div>

            {/* LE GROS BOUTON */}
            <button
              onClick={onOpenNewProject}
              className="w-full md:w-auto px-7 py-4 rounded-2xl bg-white text-emerald-950 font-black text-base shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              <span>+ NOUVEAU PROJET</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Cards (Inspiration Pinterest 01 & 07) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border-2 border-line-strong rounded-2xl p-4 shadow-brutal-sm">
            <span className="font-mono text-[10px] text-ink-3 uppercase font-bold block mb-1">
              Projets Actifs
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-2xl text-ink">{projects.length}</span>
              <span className="text-[11px] text-emerald-600 font-semibold">100% synchronisés</span>
            </div>
          </div>

          <div className="bg-surface border-2 border-line-strong rounded-2xl p-4 shadow-brutal-sm">
            <span className="font-mono text-[10px] text-ink-3 uppercase font-bold block mb-1">
              Planches A4 Générées
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-2xl text-ink">
                {projects.reduce((acc, p) => acc + p.artboardsCount, 0)}
              </span>
              <span className="text-[11px] text-ink-3">Format Paysage A4</span>
            </div>
          </div>

          <div className="bg-surface border-2 border-line-strong rounded-2xl p-4 shadow-brutal-sm">
            <span className="font-mono text-[10px] text-ink-3 uppercase font-bold block mb-1">
              Accessibilité WCAG 2.2
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-2xl text-emerald-600">AA Validé</span>
              <span className="text-[11px] text-ink-3">Calcul APCA</span>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-lg text-ink">
              Mes Chartes Graphiques Récentes ({filteredProjects.length})
            </h3>
            <span className="text-xs font-mono text-ink-3">Classé par dernière modification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {filteredProjects.map((p) => {
              const brandData = BRANDS.find((b) => b.slug === p.slug);
              return (
                <div
                  key={p.id}
                  className="bg-surface border border-line hover:border-line-strong rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between pb-3 border-b border-line">
                      <div className="flex items-center gap-3">
                        {brandData ? (
                          <div className="w-10 h-10 rounded-xl bg-elevated border border-line p-1.5 flex items-center justify-center">
                            <img
                              src={svgUrl(brandData.logo)}
                              alt={p.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center font-bold text-sm">
                            {p.name[0]}
                          </div>
                        )}
                        <div>
                          <h4 className="font-display font-bold text-base text-ink group-hover:text-accent transition-colors">
                            {p.name}
                          </h4>
                          <span className="text-xs text-ink-3">{p.sector}</span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Prête</span>
                      </span>
                    </div>

                    {/* Palette Preview */}
                    <div className="mt-4">
                      <span className="text-[10px] font-mono uppercase text-ink-3 block mb-1.5">
                        Palette active (4 nuances)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {p.palette.map((color, idx) => (
                          <div
                            key={idx}
                            className="flex-1 h-6 rounded-lg border border-line shadow-xs transition-transform hover:scale-105"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{p.updatedAt}</span>
                      </div>
                      <span className="font-mono">{p.artboardsCount} artboards</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-line flex items-center justify-between gap-3">
                    <button
                      onClick={() => onNavigate('studio', p.slug)}
                      className="flex-1 py-2 px-3 rounded-xl bg-ink text-surface text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Ouvrir dans le Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => showToast(`Tokens copiés pour ${p.name}`)}
                      className="p-2 rounded-xl border border-line hover:bg-elevated text-ink-2 hover:text-ink transition-colors"
                      title="Copier les tokens"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
