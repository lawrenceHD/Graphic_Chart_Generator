'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BrandView } from '../../studio/workspace/brand-view';
import { demoFor } from '../demo';
import type { LandingExample } from '../example-source';

// The page follows one example brand at a time: the hero, the sheets, the mockups and the evidence all read
// it from here, so a click on a brand repaints the whole page with that brand's palette and files.
interface Brand {
  readonly examples: readonly LandingExample[];
  readonly example: LandingExample;
  readonly view: BrandView;
  readonly select: (id: string) => void;
}

const BrandContext = createContext<Brand | null>(null);

export function BrandProvider({
  examples,
  children,
}: {
  readonly examples: readonly LandingExample[];
  readonly children: ReactNode;
}) {
  const [first] = examples;
  const [id, setId] = useState(first?.id ?? '');
  const value = useMemo((): Brand | null => {
    const example = examples.find((entry) => entry.id === id) ?? first;
    if (example === undefined) return null;
    return { examples, example, view: demoFor(example.id).view, select: setId };
  }, [examples, first, id]);
  if (value === null) return null;
  return <BrandContext value={value}>{children}</BrandContext>;
}

export function useBrand(): Brand {
  const brand = useContext(BrandContext);
  if (brand === null) throw new Error('useBrand needs a BrandProvider');
  return brand;
}

/** Optional read for components that also live outside the provider (tests, other pages). */
export function useOptionalBrand(): Brand | null {
  return useContext(BrandContext);
}
