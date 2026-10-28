'use client';

import { useEffect, useRef } from 'react';

// Cloudflare Turnstile in "execute" mode: invisible until it needs the person (interaction-only), run
// when the form is sent. Explicit rendering, script loaded once (allowed by 'strict-dynamic', ADR-024).
interface TurnstileOptions {
  readonly sitekey: string;
  readonly execution: 'execute';
  readonly appearance: 'interaction-only';
  readonly callback: (token: string) => void;
  readonly 'error-callback': () => void;
  readonly 'expired-callback': () => void;
}
interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_TIMEOUT_MS = 30_000;
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile script unavailable'));
    };
    document.head.append(script);
  });
  return loading;
}

export function useTurnstile(siteKey: string) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const waiting = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    const settle = (token: string | null) => {
      waiting.current?.(token);
      waiting.current = null;
    };
    loadScript()
      .then(() => {
        const api = window.turnstile;
        if (cancelled || api === undefined || box.current === null) return;
        widget.current = api.render(box.current, {
          sitekey: siteKey,
          execution: 'execute',
          appearance: 'interaction-only',
          callback: settle,
          'error-callback': () => {
            settle(null);
          },
          'expired-callback': () => {
            settle(null);
          },
        });
      })
      .catch(() => {
        // No script (offline, blocked): getToken answers null and the form shows the anti-bot message.
      });
    return () => {
      cancelled = true;
      if (widget.current !== null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  const getToken = (): Promise<string | null> =>
    new Promise((resolve) => {
      const api = window.turnstile;
      const id = widget.current;
      if (api === undefined || id === null) {
        resolve(null);
        return;
      }
      waiting.current = resolve;
      api.reset(id);
      api.execute(id);
      setTimeout(() => {
        if (waiting.current !== resolve) return;
        waiting.current = null;
        resolve(null);
      }, TOKEN_TIMEOUT_MS);
    });

  return { box, getToken };
}
