import { err, ok, type Result } from '@app/kernel';

export type AiErrorCode =
  'AI_QUOTA' | 'AI_UNAVAILABLE' | 'AI_REQUEST_REJECTED' | 'AI_OUTPUT_INVALID';
export interface AiError {
  code: AiErrorCode;
  message: string;
}

export type GeminiTransport = (
  model: string,
  method: 'generateContent' | 'embedContent',
  body: unknown,
) => Promise<Result<unknown, AiError>>;

type FetchLike = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<Response>;

export interface TransportOptions {
  apiKey: string;
  fetch: FetchLike;
  sleep: (ms: number) => Promise<void>;
  // 07_AI_COPILOT.md §2: 30 s per call, 2 retries at most.
  timeoutMs?: number;
  retries?: number;
}

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const TRANSIENT = new Set([429, 500, 502, 503, 504]);

function messageOf(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const { error } = body;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message).slice(0, 300);
    }
  }
  return '';
}

export function createGeminiTransport(options: TransportOptions): GeminiTransport {
  const retries = options.retries ?? 2;
  const redact = (text: string): string =>
    options.apiKey ? text.replaceAll(options.apiKey, '[redacted]') : text;
  const timeoutMs = options.timeoutMs ?? 30_000;
  // The key travels only in this header: never in the URL, a log line or an error message.
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey };
  return async (model, method, body) => {
    let last = '';
    if (options.apiKey.trim() === '') {
      return err({ code: 'AI_REQUEST_REJECTED', message: 'missing API key' });
    }
    let wait = 0;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) await options.sleep(Math.max(wait, 2_000 * 2 ** (attempt - 1)));
      wait = 0;
      let response: Response;
      try {
        response = await options.fetch(`${API}/${encodeURIComponent(model)}:${method}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        last = error instanceof Error ? error.name : 'network error';
        continue;
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }
      if (response.ok) {
        if (payload === undefined)
          return err({ code: 'AI_UNAVAILABLE', message: 'unreadable response' });
        return ok(payload);
      }
      const detail = redact(messageOf(payload));
      if (response.status === 429 && /per ?day/i.test(detail)) {
        return err({ code: 'AI_QUOTA', message: `daily quota reached for ${model}` });
      }
      if (!TRANSIENT.has(response.status)) {
        return err({
          code: 'AI_REQUEST_REJECTED',
          message: `HTTP ${String(response.status)} ${detail}`.trim(),
        });
      }
      // Per-minute limits say how long to wait; honour it, capped by the call budget.
      const retryAfter = Number(response.headers.get('retry-after'));
      if (Number.isFinite(retryAfter) && retryAfter > 0)
        wait = Math.min(retryAfter * 1000, timeoutMs);
      last = `HTTP ${String(response.status)}`;
    }
    return err({ code: 'AI_UNAVAILABLE', message: `${model} unavailable after retries (${last})` });
  };
}
