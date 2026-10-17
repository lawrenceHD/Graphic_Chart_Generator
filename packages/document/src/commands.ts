import { err, type Result } from '@app/kernel';
import { ApplyInputSchema, type ApplyInput } from './command-schema.js';
import { applyBrandCommand } from './command-brand.js';
import { isTooLarge, type OperationResult } from './command-internal.js';
import { applyPageFieldCommand } from './command-page-fields.js';
import { applyPageOrderCommand } from './command-page-order.js';
import { BrandDocumentSchema, type BrandDocument } from './schema.js';

export type CommandError =
  | { readonly code: 'PAGE_NOT_FOUND' }
  | { readonly code: 'FIELD_NOT_ALLOWED' }
  | { readonly code: 'VALUE_OUT_OF_RANGE' }
  | { readonly code: 'INVALID_COMMAND' }
  | { readonly code: 'DOCUMENT_TOO_LARGE' }
  | { readonly code: 'EXPECTATION_FAILED' };

export type ApplyResult = Result<
  { readonly doc: BrandDocument; readonly inverse: ApplyInput },
  CommandError
>;

export function apply(documentInput: unknown, commandInput: unknown): ApplyResult {
  const parsedDocument = BrandDocumentSchema.safeParse(documentInput);
  if (!parsedDocument.success) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const parsedCommand = ApplyInputSchema.safeParse(commandInput);
  if (!parsedCommand.success) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const operation = applyParsedCommand(parsedDocument.data, parsedCommand.data);
  if (!operation.ok) {
    return operation;
  }
  if (isTooLarge(operation.value.doc)) {
    return err({ code: 'DOCUMENT_TOO_LARGE' });
  }
  if (!BrandDocumentSchema.safeParse(operation.value.doc).success) {
    return err({ code: 'INVALID_COMMAND' });
  }
  return operation;
}

function applyParsedCommand(document: BrandDocument, command: ApplyInput): OperationResult {
  switch (command.type) {
    case 'SetColorToken':
    case 'SetTypographyPairing':
    case 'SetBrandField':
    case 'SetLogoRules':
      return applyBrandCommand(document, command);
    case 'ReorderPage':
    case 'AddPage':
    case 'RemovePage':
      return applyPageOrderCommand(document, command);
    case 'SetPageField':
    case 'SetPageOverride':
    case 'ClearPageOverride':
    case 'SelectScene':
    case 'RestoreMockup':
      return applyPageFieldCommand(document, command);
  }
}
