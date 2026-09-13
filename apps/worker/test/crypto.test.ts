import { describe, expect, it } from 'vitest';
import { hashPassphrase } from '../src/crypto.js';

describe('hashPassphrase', () => {
  it('returns the SHA-256 hex digest of the input', async () => {
    // Known NIST test vector for SHA-256("abc").
    expect(await hashPassphrase('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic and sensitive to every character', async () => {
    const a = await hashPassphrase('correct horse battery staple');
    const b = await hashPassphrase('correct horse battery staple');
    const c = await hashPassphrase('correct horse battery staplE');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
