import { AssetErrorCodeSchema, type AssetErrorCode } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';

// Browser side of 04_API_CONTRACTS.md §3 "Assets": declare the file, PUT its bytes to the presigned URL
// (ADR-013, the application never proxies them), then confirm so the scan starts. Every answer is
// validated; the scan verdict then arrives on the project's SSE stream (asset.status).
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface UploadedAsset {
  readonly assetId: string;
  readonly status: 'pending' | 'quarantined' | 'clean';
}

export type UploadFailure =
  | { readonly kind: 'rejected'; readonly code: AssetErrorCode }
  | { readonly kind: 'http'; readonly status: number; readonly code: string }
  | { readonly kind: 'storage'; readonly status: number }
  | { readonly kind: 'network' };

const PublicAsset = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'quarantined', 'clean', 'rejected']),
  rejectReason: AssetErrorCodeSchema.nullable(),
});
const AssetAnswer = z.object({ asset: PublicAsset });
const DeclareAnswer = AssetAnswer.extend({
  upload: z.object({
    url: z.url({ protocol: /^https?$/ }),
    method: z.literal('PUT'),
    headers: z.record(z.string(), z.string()),
  }),
});
const Problem = z.object({ code: z.string().min(1) });

class NetworkError extends Error {}

async function send(fetcher: Fetcher, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetcher(url, init);
  } catch (cause) {
    // fetch rejects only when no answer came back (offline, DNS, CORS): the caller offers a retry.
    throw new NetworkError('upload request failed', { cause });
  }
}

async function readAnswer<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<Result<T, UploadFailure>> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = Problem.safeParse(body);
    const code = problem.success ? problem.data.code : 'HTTP_ERROR';
    return err({ kind: 'http', status: response.status, code });
  }
  const parsed = schema.safeParse(body);
  return parsed.success
    ? ok(parsed.data)
    : err({ kind: 'http', status: response.status, code: 'INVALID_RESPONSE' });
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

async function steps(
  fetcher: Fetcher,
  projectId: string,
  file: File,
): Promise<Result<UploadedAsset, UploadFailure>> {
  const declared = await readAnswer(
    await send(
      fetcher,
      `/api/v1/projects/${encodeURIComponent(projectId)}/assets/uploads`,
      json({ kind: 'logo_original', fileName: file.name, bytes: file.size }),
    ),
    DeclareAnswer,
  );
  if (!declared.ok) return declared;
  const { asset, upload } = declared.value;

  const stored = await send(fetcher, upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!stored.ok) return err({ kind: 'storage', status: stored.status });

  const completed = await readAnswer(
    await send(fetcher, `/api/v1/assets/${encodeURIComponent(asset.id)}/complete`, json({})),
    AssetAnswer,
  );
  if (!completed.ok) return completed;
  const { id, status, rejectReason } = completed.value.asset;
  if (status === 'rejected')
    return err({ kind: 'rejected', code: rejectReason ?? 'ASSET_DECODE_FAILED' });
  return ok({ assetId: id, status });
}

export async function uploadLogo(
  fetcher: Fetcher,
  projectId: string,
  file: File,
): Promise<Result<UploadedAsset, UploadFailure>> {
  try {
    return await steps(fetcher, projectId, file);
  } catch (error) {
    if (error instanceof NetworkError) return err({ kind: 'network' });
    throw error;
  }
}
