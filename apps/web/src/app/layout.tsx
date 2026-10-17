import type { ReactNode } from 'react';
import { connection } from 'next/server';

// Every page is rendered per request so Next.js can apply the CSP nonce (ADR-024).
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();

  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
