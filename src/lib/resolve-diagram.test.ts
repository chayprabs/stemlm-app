import { describe, it, expect, vi } from 'vitest';

vi.mock('./mermaid', () => ({
  renderMermaid: vi.fn(
    async () =>
      '<svg viewBox="0 0 100 60"><style>.node{fill:#fff}</style><rect width="40" height="20" style="fill:#eee;stroke:#333"/></svg>',
  ),
}));

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
    expect(svg).toContain('width="40"');
    expect(svg).toContain('height="20"');
  });

  it('normalizes admittance triangle markers through the full resolve path', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content:
          '<svg viewBox="0 0 320 220"><defs>' +
          '<marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10">' +
          '<polygon points="0,0 10,5 0,10 3,5" fill="black"/></marker></defs>' +
          '<line x1="40" y1="160" x2="200" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>' +
          '<line x1="200" y1="160" x2="200" y2="60" stroke="#ffa500" stroke-width="2" marker-end="url(#arrow)"/>' +
          '<line x1="40" y1="160" x2="200" y2="60" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow)"/>' +
          '</svg>',
      },
      'light',
      'step',
    );
    expect(svg).not.toContain('userSpaceOnUse');
    expect(svg).not.toContain('fill="black"');
    expect(svg).toContain('fill="#3b82f6"');
    expect(svg).toContain('fill="#ffa500"');
    expect(svg).toContain('fill="#16a34a"');
  });

  it('preserves mermaid inline styles through the resolve path', async () => {
    const svg = await resolveDiagramSvg(
      { type: 'mermaid', content: 'graph TD\n  A["Start"] --> B["End"]' },
      'light',
    );
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/style=|fill=|stroke=/i);
  });

  it('uses print profile bounds for PDF export', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content: '<svg viewBox="0 0 520 260"><text x="1" y="10">pdf-diagram</text></svg>',
      },
      'light',
      'print',
    );
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="100"');
  });
});
