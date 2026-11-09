'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Stops the ambient motion of the page (ribbons, floating chips, the turning arc, swaying pages): WCAG 2.2.2
 * asks for a way to pause anything that moves on its own for more than five seconds. The choice is a data
 * attribute on the root, read by the stylesheet; it does not touch what the visitor triggers (hover, scroll).
 */
export function MotionToggle() {
  const t = useTranslations('homePage.motion');
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={paused}
      onClick={() => {
        const next = !paused;
        setPaused(next);
        if (next) document.documentElement.dataset.motionPaused = '';
        else delete document.documentElement.dataset.motionPaused;
      }}
      className="fixed left-5 z-50 flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink shadow-lg"
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {paused ? (
        <Play className="size-4" aria-hidden="true" />
      ) : (
        <Pause className="size-4" aria-hidden="true" />
      )}
      {paused ? t('play') : t('pause')}
    </button>
  );
}
