import React, { useState } from 'react';
import { X, Upload, Sparkles, ArrowRight, Check, Image as ImageIcon } from 'lucide-react';
import { BRANDS, svgUrl } from '../lib/brandData';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (brandSlug: string, customName?: string) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreateProject }: NewProjectModalProps) {
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string>('instacart');
  const [customName, setCustomName] = useState<string>('');
  const [customSector, setCustomSector] = useState<string>('Tech & Digital');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStart = () => {
    onCreateProject(selectedBrandSlug, customName || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface border-2 border-line-strong rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-2 hover:text-ink hover:bg-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nouveau Projet</span>
          </div>
          <h2 className="font-display font-black text-2xl text-ink">
            Créer votre Charte Graphique
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-2">
            Déposez votre logo vectoriel ou choisissez une marque pour tester le moteur.
          </p>
        </div>

        {/* Form Body */}
        <div className="space-y-5">
          {/* 1. Logo Dropzone */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-ink-2 mb-2">
              1. Déposer le logo (SVG ou PNG)
            </label>
            <div className="border-2 border-dashed border-line hover:border-line-strong rounded-2xl p-6 text-center bg-elevated/40 hover:bg-elevated/70 transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-line mx-auto flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-bold text-ink block">
                Glissez votre fichier SVG / PNG ici, ou parcourez
              </span>
              <span className="text-[11px] text-ink-3 mt-1 block">
                Vectoriel SVG recommandé • Tracé préservé à 100% sans altération
              </span>
            </div>

            {/* Quick Presets */}
            <div className="mt-3">
              <span className="text-[10px] font-mono uppercase text-ink-3 block mb-1.5">
                Ou tester avec un logo officiel :
              </span>
              <div className="grid grid-cols-4 gap-2">
                {BRANDS.slice(0, 4).map((b) => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => {
                      setSelectedBrandSlug(b.slug);
                      setCustomName(b.name);
                      setCustomSector(b.sector);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      selectedBrandSlug === b.slug
                        ? 'border-ink bg-ink text-surface shadow-sm'
                        : 'border-line bg-surface hover:border-ink/30 text-ink'
                    }`}
                  >
                    <img
                      src={svgUrl(b.logo)}
                      alt={b.name}
                      className="w-5 h-5 mx-auto object-contain mb-1"
                    />
                    <span className="text-[10px] font-bold block truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Brand Name & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-ink-2 mb-1">
                2. Nom de la Marque
              </label>
              <input
                type="text"
                placeholder="Ex : Studio Horizon"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-ink text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-ink-2 mb-1">
                3. Secteur d'activité
              </label>
              <input
                type="text"
                placeholder="Ex : Tech, Gastronomie..."
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-ink text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-8 pt-5 border-t border-line flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-ink-2 hover:text-ink hover:bg-elevated transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="flex-1 py-3 px-5 rounded-xl bg-ink text-surface font-bold text-xs sm:text-sm shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Générer en direct & Ouvrir le Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
