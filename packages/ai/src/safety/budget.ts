import { err } from '@app/kernel';
import type { GeminiTransport } from '../gemini/transport.js';

export interface BudgetLimits {
  /** Requests sent to the model, retries of the schema loop included. */
  maxCalls: number;
  /** Cumulative size of the JSON bodies sent (images count as their base64), a proxy for input tokens. */
  maxInputChars: number;
  /** Ceiling forced on `generationConfig.maxOutputTokens` of every request. */
  maxOutputTokens: number;
}

export interface BudgetedTransport {
  transport: GeminiTransport;
  usage: () => { calls: number; inputChars: number };
}

// Free-tier defaults for one research run: reading + embedding + one schema retry each, with a small image.
export const DEFAULT_BUDGET: BudgetLimits = {
  maxCalls: 6,
  maxInputChars: 4_000_000,
  maxOutputTokens: 2_000,
};

// Only Gemini model ids reach the transport: no URL, path segment or other provider can be smuggled in.
const MODEL_ID = /^gemini-[a-z0-9][a-z0-9.-]{0,60}$/;

function capOutput(body: unknown, maxOutputTokens: number): unknown {
  if (typeof body !== 'object' || body === null || !('generationConfig' in body)) return body;
  const { generationConfig } = body;
  if (typeof generationConfig !== 'object' || generationConfig === null) return body;
  const asked =
    'maxOutputTokens' in generationConfig && typeof generationConfig.maxOutputTokens === 'number'
      ? generationConfig.maxOutputTokens
      : maxOutputTokens;
  return {
    ...body,
    generationConfig: { ...generationConfig, maxOutputTokens: Math.min(asked, maxOutputTokens) },
  };
}

export function withBudget(inner: GeminiTransport, limits: BudgetLimits): BudgetedTransport {
  let calls = 0;
  let inputChars = 0;
  const transport: GeminiTransport = async (model, method, body) => {
    if (!MODEL_ID.test(model)) {
      return err({ code: 'AI_REQUEST_REJECTED', message: 'model id is not a Gemini model name' });
    }
    // A generation request with no generationConfig still gets the output ceiling.
    const withConfig =
      method === 'generateContent' &&
      typeof body === 'object' &&
      body !== null &&
      !('generationConfig' in body)
        ? { ...body, generationConfig: {} }
        : body;
    const capped = capOutput(withConfig, limits.maxOutputTokens);
    const size = JSON.stringify(capped).length;
    if (calls >= limits.maxCalls || inputChars + size > limits.maxInputChars) {
      return err({ code: 'AI_QUOTA', message: 'run budget exhausted (calls or input size)' });
    }
    calls += 1;
    inputChars += size;
    return inner(model, method, capped);
  };
  return { transport, usage: () => ({ calls, inputChars }) };
}
