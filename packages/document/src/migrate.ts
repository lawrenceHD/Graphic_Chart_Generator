import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import { BrandDocumentSchema, CURRENT_SCHEMA_VERSION, type BrandDocument } from './schema.js';

export type MigrationError =
  | { readonly code: 'UNKNOWN_SCHEMA_VERSION'; readonly version: unknown }
  | { readonly code: 'INVALID_DOCUMENT'; readonly issues: string[] };

const VersionHeaderSchema = z.object({ schemaVersion: z.unknown() }).loose();

function isBrandDocument(input: unknown): input is BrandDocument {
  return BrandDocumentSchema.safeParse(input).success;
}

export function migrate(input: unknown): Result<BrandDocument, MigrationError> {
  try {
    if (typeof input !== 'object' || input === null || !Object.hasOwn(input, 'schemaVersion')) {
      return err({ code: 'INVALID_DOCUMENT', issues: ['schemaVersion manquant'] });
    }
    const header = VersionHeaderSchema.safeParse(input);
    if (!header.success) {
      return err({ code: 'INVALID_DOCUMENT', issues: ['schemaVersion manquant'] });
    }

    const version: unknown = header.data.schemaVersion;
    if (
      typeof version !== 'number' ||
      !Number.isInteger(version) ||
      version < 1 ||
      version > CURRENT_SCHEMA_VERSION
    ) {
      return err({ code: 'UNKNOWN_SCHEMA_VERSION', version });
    }

    if (isBrandDocument(input)) {
      return ok(input);
    }

    const document = BrandDocumentSchema.safeParse(input);
    if (!document.success) {
      const issues = document.error.issues.map((issue) => {
        const path = issue.path.map(String).join('.');
        return `${path || 'document'} : ${issue.message}`;
      });
      return err({ code: 'INVALID_DOCUMENT', issues });
    }

    return ok(document.data);
  } catch {
    return err({ code: 'INVALID_DOCUMENT', issues: ['document invalide'] });
  }
}
