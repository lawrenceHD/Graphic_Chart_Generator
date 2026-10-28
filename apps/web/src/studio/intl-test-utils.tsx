import { render, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import fr from '../../messages/fr.json' with { type: 'json' };

function French({ children }: { readonly children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="fr" messages={fr}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Renders a client component with the French messages (kept on rerender), as the default locale. */
export function renderFr(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: French });
}

export const frMessages = fr;
