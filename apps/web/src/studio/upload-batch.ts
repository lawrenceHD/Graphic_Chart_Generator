import type { AssetErrorCode } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { toUploads, type BrandInputs } from './brand-inputs-model';
import type { AssetVerdict } from './timeline';
import { uploadBrandFile, type Fetcher, type UploadFailure } from './upload';

// Sends everything the person gave at the start (logos, primary first, then the optional document) and
// decides, once every scan verdict is known, whether the analysis can start. Files the server refuses are
// listed; as long as one logo is clean the analysis goes on without them.
// The manifest is optional: a refusal for what the file is (4xx other than auth and rate limit) is reported and
// the rest goes on; an outage or a session problem is a failure of the batch.
const isValidationStatus = (status: number): boolean =>
  status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429;

export interface Notice {
  readonly name: string;
  readonly code: AssetErrorCode;
}

export interface SentFile {
  readonly assetId: string;
  readonly name: string;
  readonly document: boolean;
  /** Already clean in the answer of the upload (no verdict to wait for). */
  readonly clean: boolean;
}

/** Filled as files go, so what was accepted before a failure is not lost. */
export interface BatchUpload {
  readonly accepted: SentFile[];
  /** Refused at completion, or a document the API turned down. */
  readonly refused: Notice[];
}

/**
 * `sent` holds the files an earlier try already got accepted (they are not sent again: the project's logo
 * ceiling would refuse them). The manifest being optional, its failures are reported, never fatal.
 */
export async function uploadBatch(
  fetcher: Fetcher,
  projectId: string,
  inputs: BrandInputs,
  sent: Set<File>,
  onFile: (name: string) => void,
  into: BatchUpload,
): Promise<Result<undefined, UploadFailure>> {
  const { accepted, refused } = into;
  for (const { file, declaration } of toUploads(inputs)) {
    if (sent.has(file)) continue;
    onFile(file.name);
    const uploaded = await uploadBrandFile(fetcher, projectId, file, declaration);
    if (!uploaded.ok) {
      const failure = uploaded.error;
      if (failure.kind === 'rejected') refused.push({ name: file.name, code: failure.code });
      else if (
        declaration.kind === 'brief_doc' &&
        failure.kind === 'http' &&
        isValidationStatus(failure.status)
      )
        refused.push({ name: file.name, code: 'ASSET_DECODE_FAILED' });
      else return err(failure);
      continue;
    }
    sent.add(file);
    accepted.push({
      assetId: uploaded.value.assetId,
      name: file.name,
      document: declaration.kind === 'brief_doc',
      clean: uploaded.value.status === 'clean',
    });
  }
  return ok(undefined);
}

export interface Settled {
  readonly cleanLogos: number;
  readonly refused: readonly Notice[];
}

/** Null while a verdict is missing. `cleanBefore`: logos found clean by earlier tries. */
export function settleBatch(
  accepted: readonly SentFile[],
  verdicts: ReadonlyMap<string, AssetVerdict>,
  refusedAtUpload: readonly Notice[],
  cleanBefore: number,
): Settled | null {
  const refused = [...refusedAtUpload];
  let cleanLogos = cleanBefore;
  for (const file of accepted) {
    const verdict: AssetVerdict | undefined = file.clean
      ? { status: 'clean' }
      : verdicts.get(file.assetId);
    if (verdict === undefined) return null;
    if (verdict.status === 'rejected') refused.push({ name: file.name, code: verdict.code });
    else if (!file.document) cleanLogos += 1;
  }
  return { cleanLogos, refused };
}
