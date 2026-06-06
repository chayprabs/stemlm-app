import { describe, it, expect } from 'vitest';
import { normalizeDiagramSource, resolveDiagramSvg } from './resolve-diagram';

describe('normalizeDiagramSource', () => {
  it('strips markdown fences', () => {
    const raw = '```svg\n<svg viewBox="0 0 10 10"><circle r="1"/></svg>\n```';
    expect(normalizeDiagramSource(raw)).toContain('<svg');
    expect(normalizeDiagramSource(raw)).not.toContain('```');
  });

  it('decodes HTML-entity encoded svg', () => {
    const raw = '&lt;svg viewBox="0 0 10 10"&gt;&lt;circle r="1"/&gt;&lt;/svg&gt;';
    expect(normalizeDiagramSource(raw)).toBe('<svg viewBox="0 0 10 10"><circle r="1"/></svg>');
  });
});

describe('resolveDiagramSvg', () => {
  it('returns sanitized svg markup for inline svg diagrams', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content: '<svg viewBox="0 0 40 20"><text x="1" y="10">probe-diagram</text></svg>',
      },
      'dark',
    );
    expect(svg).toContain('probe-diagram');
    expect(svg).toContain('<svg');
  });
});
