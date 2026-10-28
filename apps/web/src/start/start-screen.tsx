'use client';

import { useRouter } from 'next/navigation';
import { StartForm } from './start-form';
import { useTurnstile } from './turnstile';

export function StartScreen({ turnstileSiteKey }: { readonly turnstileSiteKey: string }) {
  const router = useRouter();
  const { box, getToken } = useTurnstile(turnstileSiteKey);
  return (
    <>
      <StartForm
        getTurnstileToken={getToken}
        navigate={(path) => {
          router.push(path);
        }}
      />
      <div ref={box} className="mt-6" />
    </>
  );
}
