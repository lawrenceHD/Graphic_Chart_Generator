import { err } from '@app/kernel';
import type { Command } from './command-schema.js';
import {
  expectationFailed,
  expectationFails,
  type OperationResult,
  success,
} from './command-internal.js';
import type { BrandDocument } from './schema.js';

type BrandCommand = Extract<
  Command,
  { readonly type: 'SetColorToken' | 'SetTypographyPairing' | 'SetBrandField' | 'SetLogoRules' }
>;

export function applyBrandCommand(document: BrandDocument, command: BrandCommand): OperationResult {
  switch (command.type) {
    case 'SetColorToken': {
      const previous = document.tokens.colors[command.token];
      if (expectationFails(command.expect, previous.hex)) {
        return expectationFailed();
      }
      const colors = {
        ...document.tokens.colors,
        [command.token]: { hex: command.hex, source: command.source },
      };
      return success(
        { ...document, tokens: { ...document.tokens, colors } },
        {
          type: 'SetColorToken',
          token: command.token,
          hex: previous.hex,
          source: previous.source,
          expect: command.hex,
        },
      );
    }
    case 'SetTypographyPairing': {
      const previous = document.tokens.typography.pairingId;
      if (expectationFails(command.expect, previous)) {
        return expectationFailed();
      }
      return success(
        {
          ...document,
          tokens: { ...document.tokens, typography: { pairingId: command.pairingId } },
        },
        { type: 'SetTypographyPairing', pairingId: previous, expect: command.pairingId },
      );
    }
    case 'SetBrandField':
      return applyBrandField(document, command);
    case 'SetLogoRules':
      return applyLogoRules(document, command);
  }
}

function applyBrandField(
  document: BrandDocument,
  command: Extract<Command, { readonly type: 'SetBrandField' }>,
): OperationResult {
  if (expectationFails(command.expect, document.brand[command.field])) {
    return expectationFailed();
  }
  // One branch per field keeps each value paired with its own schema type.
  switch (command.field) {
    case 'name':
      return success(
        { ...document, brand: { ...document.brand, name: command.value } },
        { type: 'SetBrandField', field: 'name', value: document.brand.name, expect: command.value },
      );
    case 'mission':
      return success(
        { ...document, brand: { ...document.brand, mission: command.value } },
        {
          type: 'SetBrandField',
          field: 'mission',
          value: document.brand.mission,
          expect: command.value,
        },
      );
    case 'vision':
      return success(
        { ...document, brand: { ...document.brand, vision: command.value } },
        {
          type: 'SetBrandField',
          field: 'vision',
          value: document.brand.vision,
          expect: command.value,
        },
      );
    case 'values':
      return success(
        { ...document, brand: { ...document.brand, values: command.value } },
        {
          type: 'SetBrandField',
          field: 'values',
          value: document.brand.values,
          expect: command.value,
        },
      );
    case 'archetype':
      return success(
        { ...document, brand: { ...document.brand, archetype: command.value } },
        {
          type: 'SetBrandField',
          field: 'archetype',
          value: document.brand.archetype,
          expect: command.value,
        },
      );
  }
}

function applyLogoRules(
  document: BrandDocument,
  command: Extract<Command, { readonly type: 'SetLogoRules' }>,
): OperationResult {
  const valid =
    command.clearSpaceRatio >= 0.1 &&
    command.clearSpaceRatio <= 0.5 &&
    Number.isInteger(command.minSizePx) &&
    command.minSizePx >= 8 &&
    command.minSizePx <= 512 &&
    command.minSizeMm >= 2 &&
    command.minSizeMm <= 100;
  if (!valid) {
    return err({ code: 'VALUE_OUT_OF_RANGE' });
  }
  const previous = document.tokens.logo;
  if (expectationFails(command.expect, previous)) {
    return expectationFailed();
  }
  const logo = {
    clearSpaceRatio: command.clearSpaceRatio,
    minSizePx: command.minSizePx,
    minSizeMm: command.minSizeMm,
  };
  return success(
    { ...document, tokens: { ...document.tokens, logo } },
    { type: 'SetLogoRules', ...previous, expect: logo },
  );
}
