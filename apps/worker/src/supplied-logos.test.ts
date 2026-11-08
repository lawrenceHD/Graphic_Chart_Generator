import { describe, expect, it } from 'vitest';
import { suppliedVariants } from './supplied-logos.js';

describe('suppliedVariants (logos the user brought instead of derived ones)', () => {
  it('maps each supplied role to its kit slot, the latest logo of a role winning', () => {
    const slots = suppliedVariants('0009', [
      { id: '0001', meta: { role: 'mono-black' } },
      { id: '0002', meta: { role: 'mono-black' } },
      { id: '0003', meta: { role: 'icon' } },
      { id: '0004', meta: { role: 'horizontal' } },
      { id: '0005', meta: { role: 'primary' } },
      { id: '0006', meta: {} },
      { id: '0007', meta: 'broken' },
    ]);
    expect(Object.fromEntries(slots)).toEqual({
      'mono-black': '0002',
      favicon: '0003',
      horizontal: '0004',
    });
  });

  it('never lists the primary logo itself as a variant', () => {
    const slots = suppliedVariants('0001', [{ id: '0001', meta: { role: 'icon', primary: true } }]);
    expect(slots.size).toBe(0);
  });
});
