import { AnimatePresence, motion } from 'motion/react';
import { FileArchive, FileJson, FileText, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Brand } from '../lib/brand';
import { fade, spring } from '../lib/motion';

const FORMATS = [
  { icon: FileText, title: 'Charte PDF', detail: 'Toutes les pages, prête à partager' },
  {
    icon: FileArchive,
    title: 'Kit complet ZIP',
    detail: 'Logos SVG et PNG, variantes, favicon, README',
  },
  { icon: FileJson, title: 'Design tokens', detail: 'design-tokens.json et variables CSS' },
];

export function ExportDialog({
  open,
  onClose,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  brand: Brand;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={spring}
            className="relative w-full max-w-md rounded-t-[24px] border border-line bg-surface p-5 sm:rounded-[24px]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 id="export-title" className="m-0 text-lg font-semibold">
                  Exporter la charte
                </h2>
                <p className="m-0 text-sm text-ink-3">{brand.name}</p>
              </div>
              <button
                ref={close}
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-elevated"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="m-0 list-none space-y-2 p-0">
              {FORMATS.map(({ icon: Icon, title, detail }) => (
                <li key={title}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line bg-canvas p-3 text-left transition-colors hover:border-line-strong"
                  >
                    <Icon className="h-6 w-6 text-accent" aria-hidden />
                    <span>
                      <span className="block text-sm font-medium">{title}</span>
                      <span className="block text-xs text-ink-3">{detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mb-0 mt-4 text-xs text-ink-3">
              Aperçu : les fichiers réels arriveront avec la version complète du studio.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
