import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('P4 integrator catalog and leftover hardening', () => {
  it('renders a Frost diagram from both the ring size and electron count', async () => {
    const result = await compileDiagramSpec({ type: 'frost', content: 'n: 6\ne: 5' }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const labels = result.scene.labels.map((label) => label.text ?? label.katex ?? '');
    expect(labels).toContain('e=5');
    expect(result.scene.labels.filter((label) => label.id.startsWith('frost-orbital-'))).toHaveLength(6);
    expect(result.scene.labels.filter((label) => /^frost-electron-\d+$/.test(label.id)).length).toBe(5);
  });

  it('fails closed for non-numeric or impossible Frost occupancy', async () => {
    const invalidNumber = await compileDiagramSpec({ type: 'frost', content: 'n: six\ne: 5' }, 'step');
    const invalidOccupancy = await compileDiagramSpec({ type: 'frost', content: 'n: 6\ne: 13' }, 'step');
    expect(invalidNumber.ok).toBe(false);
    expect(invalidOccupancy.ok).toBe(false);
  });
});
