import { describe, expect, it } from 'vitest';
import { hexToOklch } from '../../brand/color';
import { demoFor } from '../../landing/demo';

const { document: DEMO_DOCUMENT } = demoFor('la-meza');
import { readIntent } from './intents';

const read = (text: string, page: string | null = null) => readIntent(text, DEMO_DOCUMENT, page);

describe('requests typed in the copilot', () => {
  it('sets a role to a typed colour', () => {
    expect(read('accent #1f6f5c')).toMatchObject({
      kind: 'commands',
      reply: { id: 'color-set', role: 'accent', hex: '#1F6F5C' },
      commands: [{ type: 'SetColorToken', token: 'accent', hex: '#1F6F5C', expect: '#E3C884' }],
    });
    expect(read('principale 1F6F5C')).toMatchObject({ reply: { role: 'primary', hex: '#1F6F5C' } });
  });

  it('does not read French words as colours', () => {
    expect(read('efface la décade')).toEqual({ kind: 'unknown' });
  });

  it('darkens the named role with the colour engine', () => {
    const intent = read('accent plus sombre');
    expect(intent.kind).toBe('commands');
    if (intent.kind !== 'commands' || intent.reply.id !== 'color-darker') return;
    expect(intent.reply.role).toBe('accent');
    expect(hexToOklch(intent.reply.hex).L).toBeLessThan(hexToOklch('#E3C884').L);
  });

  it('swaps primary and accent', () => {
    const intent = read('échange principale et accent');
    expect(intent).toMatchObject({ reply: { id: 'swap' } });
    expect(intent.kind === 'commands' ? intent.commands.length : 0).toBe(2);
  });

  it('picks a named typeface of the catalogue, or the next one', () => {
    expect(read('police Playfair Display')).toMatchObject({
      commands: [{ type: 'SetTypographyPairing', pairingId: 'editorial-classic' }],
    });
    expect(read('autre police')).toMatchObject({ reply: { id: 'typeface' } });
  });

  it('changes the format only of a selected page', () => {
    expect(read('en portrait', 'page-cover')).toMatchObject({
      commands: [
        { type: 'SetPageOverride', pageId: 'page-cover', key: 'format', value: 'portrait' },
      ],
    });
    expect(read('en portrait')).toEqual({ kind: 'unknown' });
  });

  it('answers honestly when it does not understand', () => {
    expect(read('raconte une blague')).toEqual({ kind: 'unknown' });
    expect(read('   ')).toEqual({ kind: 'unknown' });
  });
});
