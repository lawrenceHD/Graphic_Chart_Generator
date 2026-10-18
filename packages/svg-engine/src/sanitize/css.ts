import type { AssetError } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { generate, parse, type CssNode } from 'css-tree';
import { STYLE_PROPERTIES } from './allowlists.js';
import { assetError, hasDangerousScheme, localUrl } from './model.js';

export type Declarations = ReadonlyMap<string, string>;

export interface StyleRule {
  readonly kind: 'type' | 'class' | 'id';
  readonly name: string;
  /** CSS specificity: id 100, class 10, type 1. */
  readonly specificity: number;
  readonly order: number;
  readonly declarations: Declarations;
}

const forbidden = (reason: string): Result<never, AssetError> =>
  err(assetError('ASSET_SVG_FORBIDDEN_CONTENT', reason));
const unsupported = (reason: string): Result<never, AssetError> =>
  err(assetError('ASSET_SVG_UNSUPPORTED_FEATURE', reason));

// A url() must be exactly url(#id); external or data URLs refuse the file (§3.3).
function checkValue(value: string): Result<string, AssetError> {
  if (hasDangerousScheme(value)) return forbidden('dangerous URL scheme in CSS');
  if (/url\(/i.test(value)) {
    const target = localUrl(value);
    return target === undefined ? forbidden('non-local url() in CSS') : ok(`url(#${target})`);
  }
  return ok(value.trim());
}

function declarationsOf(block: CssNode): Result<Map<string, string>, AssetError> {
  const declarations = new Map<string, string>();
  if (block.type !== 'Block' && block.type !== 'DeclarationList') return ok(declarations);
  for (const child of block.children) {
    if (child.type !== 'Declaration') continue;
    const value = checkValue(generate(child.value));
    if (!value.ok) return value;
    const property = child.property.toLowerCase();
    if (STYLE_PROPERTIES.has(property)) declarations.set(property, value.value);
  }
  return ok(declarations);
}

function parseCss(
  text: string,
  context: 'stylesheet' | 'declarationList',
): Result<CssNode, AssetError> {
  // Checked on the raw text first: css-tree may keep an unparsable @import or url() as a raw value.
  if (/@import/i.test(text)) return forbidden('@import');
  const errors: unknown[] = [];
  const tree = parse(text, {
    context,
    onParseError: (error) => {
      errors.push(error);
    },
  });
  return errors.length > 0 ? unsupported('invalid CSS') : ok(tree);
}

/** `style` attribute: whitelisted presentation properties only, converted into attributes. */
export function parseStyleAttribute(text: string): Result<Declarations, AssetError> {
  const tree = parseCss(text, 'declarationList');
  return tree.ok ? declarationsOf(tree.value) : tree;
}

/** `<style>` element: simple selectors only (type, .class, #id), to be inlined (§3.4). */
export function parseStylesheet(text: string): Result<StyleRule[], AssetError> {
  const tree = parseCss(text, 'stylesheet');
  if (!tree.ok) return tree;
  if (tree.value.type !== 'StyleSheet') return unsupported('not a stylesheet');
  const rules: StyleRule[] = [];
  for (const node of tree.value.children) {
    if (node.type === 'Atrule') return unsupported(`@${node.name}`);
    if (node.type !== 'Rule' || node.prelude.type !== 'SelectorList') return unsupported('rule');
    const declarations = declarationsOf(node.block);
    if (!declarations.ok) return declarations;
    for (const selector of node.prelude.children) {
      const parts = selector.type === 'Selector' ? selector.children.toArray() : [];
      const [simple] = parts;
      if (parts.length !== 1 || !simple) return unsupported('complex selector');
      const order = rules.length;
      if (simple.type === 'TypeSelector') {
        rules.push({
          kind: 'type',
          name: simple.name,
          specificity: 1,
          order,
          declarations: declarations.value,
        });
      } else if (simple.type === 'ClassSelector') {
        rules.push({
          kind: 'class',
          name: simple.name,
          specificity: 10,
          order,
          declarations: declarations.value,
        });
      } else if (simple.type === 'IdSelector') {
        rules.push({
          kind: 'id',
          name: simple.name,
          specificity: 100,
          order,
          declarations: declarations.value,
        });
      } else {
        return unsupported('complex selector');
      }
    }
  }
  return ok(rules);
}
