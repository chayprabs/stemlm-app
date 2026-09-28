import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

// Live Claude answer, 2026-09-28 (q04): "highlight: C_1" coloured one capacitor plate and left the other dark.
describe('highlighting a component', () => {
  it('colours every drawn part of the symbol, not its leads', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: 'std: iec\nV_s: n_src 0 DC 9\nR_1: n_src n_cap 2k\nC_1: n_cap 0 10u\nhighlight: C_1' });
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const colourOf = (id: string) => new RegExp(`id="${id}"[^>]*stroke="([^"]+)"`).exec(result.svg)?.[1];
    expect(colourOf('C_1')).toBe('#2563eb');
    expect(colourOf('C_1-b')).toBe('#2563eb');
    expect(colourOf('C_1-n1')).not.toBe('#2563eb');
  });
});
