'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mounts its children once the block is near the viewport: a page of WebGL mockups must not render them all at load. */
export function LazyMount({
  children,
  className = '',
  margin = '500px',
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [margin]);
  return (
    <div ref={ref} className={className}>
      {near ? children : null}
    </div>
  );
}
