import type { Result } from '@app/kernel';

// ADR-013: files live in R2 behind this port; apps receive an implementation, packages and tests never
// talk to R2 directly. Infrastructure failures (network, credentials) throw: callers retry the job.
export interface PresignedUpload {
  readonly url: string;
  readonly method: 'PUT';
  /** Headers the client must send unchanged: they are part of the signature (SEC-11 size limit). */
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: Date;
}

export interface PresignedDownload {
  readonly contentType: string;
  readonly disposition: 'inline' | 'attachment';
}

export type ObjectReadError = 'NOT_FOUND' | 'TOO_LARGE';

export interface ObjectStorage {
  /** Short-lived upload URL whose signature binds the exact byte count. */
  presignPut(key: string, contentLength: number): Promise<PresignedUpload>;
  /** Short-lived read URL that forces the response type and disposition (ADR-023). */
  presignGet(key: string, response: PresignedDownload): Promise<string>;
  /** Size of a stored object, or null when absent. */
  head(key: string): Promise<{ readonly bytes: number } | null>;
  /** Object bytes, refused above `maxBytes` before the body is read. */
  get(key: string, maxBytes: number): Promise<Result<Uint8Array, ObjectReadError>>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}
