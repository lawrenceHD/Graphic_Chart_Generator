'use client';

import { createAuthClient } from 'better-auth/react';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const authClient = createAuthClient();

export function SignOutButton() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const signOut = async (): Promise<void> => {
    setFailed(false);
    const done = await authClient.signOut().then(
      (answer) => answer.error === null,
      () => false,
    );
    if (done) router.push('/');
    else setFailed(true);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-ink-2 transition-colors hover:bg-elevated hover:text-ink"
      >
        <LogOut aria-hidden="true" className="size-4" />
        {t('signOut')}
      </button>
      {failed ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {t('signOutFailed')}
        </p>
      ) : null}
    </>
  );
}
