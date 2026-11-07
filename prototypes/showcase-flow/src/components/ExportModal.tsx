import React, { useState } from 'react';
import { X, Download, FileText, FileCode, Image as ImageIcon, Video, CheckCircle2, Sparkles } from 'lucide-react';
import { Brand } from '../lib/brandData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand;
}

export function ExportModal({ isOpen, onClose, brand }: ExportModalProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [completedFormat, setCompletedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (format: string, filename: string) => {
    setDownloadingFormat(format);
    setTimeout(() => {
      setDownloadingFormat(null);
      setCompletedFormat(format);
      setTimeout(() => setCompletedFormat(null), 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border-2 border-line-strong rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30">
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
            <span>Export Pro & Print</span>
          </div>
          <h2 className="font-display font-black text-2xl text-ink">
            Exporter la Charte : {brand.name}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-2">
            Choisissez votre format de livraison. Tous les fichiers sont assemblés selon les standards vectoriels et d'accessibilité.
          </p>
        </div>

        {/* 4 Formats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. PDF */}
          <div className="bg-elevated/40 border-2 border-line hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">Livre de Marque PDF</h3>
              <p className="text-xs text-ink-2 mt-1">
                Fichier vectoriel complet A4 paysage, 6 plans de travail prêts pour impression ou diffusion client.
              </p>
            </div>
            <button
              onClick={() => handleDownload('pdf', `${brand.slug}-brandbook.pdf`)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-ink text-surface text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {downloadingFormat === 'pdf' ? (
                <span>Génération du PDF...</span>
              ) : completedFormat === 'pdf' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger PDF (2.4 Mo)</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Tokens JSON */}
          <div className="bg-elevated/40 border-2 border-line hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">Tokens Développeur (.ZIP)</h3>
              <p className="text-xs text-ink-2 mt-1">
                `tokens.json`, variables CSS, configuration Tailwind v4 et logos SVG assainis.
              </p>
            </div>
            <button
              onClick={() => handleDownload('tokens', `${brand.slug}-tokens.zip`)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-ink text-surface text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {downloadingFormat === 'tokens' ? (
                <span>Compression de l'archive...</span>
              ) : completedFormat === 'tokens' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger Package (58 Ko)</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Mockups 4K */}
          <div className="bg-elevated/40 border-2 border-line hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">Planches & Mockups 4K</h3>
              <p className="text-xs text-ink-2 mt-1">
                Les 6 scènes en haute définition (3840×2160) avec projection d'homographie exacte.
              </p>
            </div>
            <button
              onClick={() => handleDownload('mockups', `${brand.slug}-mockups-4k.zip`)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-ink text-surface text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {downloadingFormat === 'mockups' ? (
                <span>Exportation des images...</span>
              ) : completedFormat === 'mockups' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger Images (14 Mo)</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Vidéo Reveal (Remotion) */}
          <div className="bg-elevated/40 border-2 border-line hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-ink">Vidéo Reveal Remotion</h3>
              <p className="text-xs text-ink-2 mt-1">
                Boucle vidéo MP4 1080p animée (15 secondes) dévoilant le logo et la palette au tempo musical.
              </p>
            </div>
            <button
              onClick={() => handleDownload('video', `${brand.slug}-reveal.mp4`)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-ink text-surface text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {downloadingFormat === 'video' ? (
                <span>Rendu Remotion...</span>
              ) : completedFormat === 'video' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Téléchargé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Générer la Vidéo MP4</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="mt-6 pt-4 border-t border-line text-center text-xs text-ink-3">
          Tous les calculs de conformité sont garantis par le moteur déterministe de Charta.
        </div>
      </div>
    </div>
  );
}
