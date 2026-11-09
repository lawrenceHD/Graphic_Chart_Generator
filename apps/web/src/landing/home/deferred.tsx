'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Mounts its children after the first frame. The hero paints and hydrates first; the rest of the page (a dozen
 * sections with scroll-linked motion, whose first measure lays out the whole document) follows, so the headline
 * is never kept off screen by the sections below it.
 */
export function Deferred({ children }: { readonly children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        setReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return ready ? children : null;
}
