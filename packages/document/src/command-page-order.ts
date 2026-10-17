import { err, ok, type Result } from '@app/kernel';
import { generateKeyBetween } from 'fractional-indexing';
import type { Command } from './command-schema.js';
import type { CommandError } from './commands.js';
import {
  expectationFailed,
  expectationFails,
  type OperationResult,
  replacePage,
  sortPages,
  success,
} from './command-internal.js';
import type { BrandDocument, Page } from './schema.js';

type PageOrderCommand = Extract<
  Command,
  { readonly type: 'ReorderPage' | 'AddPage' | 'RemovePage' }
>;

export function applyPageOrderCommand(
  document: BrandDocument,
  command: PageOrderCommand,
): OperationResult {
  switch (command.type) {
    case 'ReorderPage':
      return reorderPage(document, command);
    case 'AddPage':
      return addPage(document, command);
    case 'RemovePage':
      return removePage(document, command);
  }
}

function previousPageId(document: BrandDocument, pageId: string): string | null {
  const ordered = sortPages(document.pages);
  const index = ordered.findIndex((entry) => entry.id === pageId);
  return index > 0 ? (ordered[index - 1]?.id ?? null) : null;
}

function reorderPage(
  document: BrandDocument,
  command: Extract<Command, { readonly type: 'ReorderPage' }>,
): OperationResult {
  const page = document.pages.find((entry) => entry.id === command.pageId);
  if (!page) {
    return err({ code: 'PAGE_NOT_FOUND' });
  }
  if (command.afterPageId === command.pageId) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const previousAfter = previousPageId(document, page.id);
  if (expectationFails(command.expect, previousAfter)) {
    return expectationFailed();
  }
  const otherPages = sortPages(document.pages).filter((entry) => entry.id !== page.id);
  const position = resolvePosition(otherPages, command.afterPageId, command.position);
  if (!position.ok) {
    return position;
  }
  return success(
    replacePage(document, page.id, (entry) => ({ ...entry, position: position.value })),
    {
      type: 'ReorderPage',
      pageId: page.id,
      afterPageId: previousAfter,
      position: page.position,
      expect: command.afterPageId,
    },
  );
}

function addPage(
  document: BrandDocument,
  command: Extract<Command, { readonly type: 'AddPage' }>,
): OperationResult {
  // ADR-019: identifiers come from the caller; a duplicate is a malformed command.
  if (document.pages.some((page) => page.id === command.pageId)) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const position = resolvePosition(
    sortPages(document.pages),
    command.afterPageId,
    command.position,
  );
  if (!position.ok) {
    return position;
  }
  if (document.pages.some((page) => page.position === position.value)) {
    return err({ code: 'INVALID_COMMAND' });
  }
  const page: Page = {
    id: command.pageId,
    type: command.pageType,
    position: position.value,
    title: command.title ?? '',
    data: command.data ?? {},
    overrides: command.overrides ?? {},
  };
  return success(
    { ...document, pages: [...document.pages, page] },
    { type: 'RemovePage', pageId: page.id, expect: page },
  );
}

function removePage(
  document: BrandDocument,
  command: Extract<Command, { readonly type: 'RemovePage' }>,
): OperationResult {
  const page = document.pages.find((entry) => entry.id === command.pageId);
  if (!page) {
    return err({ code: 'PAGE_NOT_FOUND' });
  }
  if (expectationFails(command.expect, page)) {
    return expectationFailed();
  }
  return success(
    { ...document, pages: document.pages.filter((entry) => entry.id !== page.id) },
    {
      type: 'AddPage',
      pageId: page.id,
      pageType: page.type,
      afterPageId: previousPageId(document, page.id),
      position: page.position,
      title: page.title,
      data: page.data,
      overrides: page.overrides,
      expect: null,
    },
  );
}

function resolvePosition(
  orderedPages: readonly Page[],
  afterPageId: string | null,
  explicitPosition: string | undefined,
): Result<string, CommandError> {
  let insertionIndex = 0;
  if (afterPageId !== null) {
    const anchorIndex = orderedPages.findIndex((page) => page.id === afterPageId);
    if (anchorIndex < 0) {
      return err({ code: 'PAGE_NOT_FOUND' });
    }
    insertionIndex = anchorIndex + 1;
  }
  // An explicit position restores a page to its exact former key (inverses).
  if (explicitPosition !== undefined) {
    return ok(explicitPosition);
  }
  const previous = insertionIndex > 0 ? (orderedPages[insertionIndex - 1]?.position ?? null) : null;
  const next = orderedPages[insertionIndex]?.position ?? null;
  try {
    return ok(generateKeyBetween(previous, next));
  } catch {
    return err({ code: 'INVALID_COMMAND' });
  }
}
