import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

// Live Claude 2026-09-27: "label: region value=pull removed at 4 s" on a plot with no region was
// dropped while the figure compiled ok — an ignored spec line.
describe('a plot region label', () => {
  it('is refused when the plot declares no region to label', async () => {
    const result = await compileDiagramSpec({
      type: 'plot',
      content: ['kind: discrete', 'data: 0,0; 4,13.58; 6.06,0; 10,-12.64', 'xlabel: time t (s)', 'ylabel: v (m/s)', 'label: region value=pull removed at 4 s'].join('\n'),
    });
    console.log('REGION_LABEL', JSON.stringify(result.ok ? 'ok' : (result as { diagnostic?: unknown }).diagnostic));
    expect(result.ok).toBe(false);
  });

  it('is drawn when a region is declared', async () => {
    const result = await compileDiagramSpec({
      type: 'plot',
      content: ['kind: function', 'fn: x^2', 'domain: 0 3', 'region: between=fn from=1 to=2', 'label: region value=area A'].join('\n'),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.svg).toContain('area A');
  });
});
