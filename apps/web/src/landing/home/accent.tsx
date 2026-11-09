import type { ReactNode } from 'react';

/** Rich-text tags of the headings: `<em>` is the one editorial word (Fraunces italic) of a title. */
export const ACCENT = {
  em: (chunks: ReactNode) => <em className="font-accent font-normal italic">{chunks}</em>,
};
