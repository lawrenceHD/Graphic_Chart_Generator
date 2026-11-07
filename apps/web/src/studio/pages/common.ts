import type { ReactNode, CSSProperties } from 'react';
import type { SheetContext } from './sheet';

export type Renderer = (props: { readonly context: SheetContext }) => ReactNode;

export const hairline = (ink: string): CSSProperties => ({
  borderColor: `color-mix(in oklch, ${ink} 14%, transparent)`,
});
