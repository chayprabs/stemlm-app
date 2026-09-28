import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('P4 integrator catalog and leftover hardening', () => {
  it('refuses a Frost diagram even with a valid ring size and electron count (D23: odd rings upside down, no Hund filling)', async () => {
    const result = await compileDiagramSpec({ type: 'frost', content: 'n: 6\ne: 5' }, 'step');
    expect(result).toMatchObject({ ok: false, code: 'refused', reason: 'unfaithful_family:frost' });
  });

  it('fails closed for non-numeric or impossible Frost occupancy', async () => {
    const invalidNumber = await compileDiagramSpec({ type: 'frost', content: 'n: six\ne: 5' }, 'step');
    const invalidOccupancy = await compileDiagramSpec({ type: 'frost', content: 'n: 6\ne: 13' }, 'step');
    expect(invalidNumber.ok).toBe(false);
    expect(invalidOccupancy.ok).toBe(false);
  });
});
