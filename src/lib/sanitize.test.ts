import { describe, it, expect } from 'vitest';
import { sanitizeSvg, extractSvg } from './sanitize';

describe('sanitizeSvg', () => {
  it('keeps drawing primitives', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10"/><text x="1" y="2">A</text></svg>');
    expect(out).toContain('<svg');
    expect(out).toContain('line');
    expect(out).toContain('text');
  });

  it('strips <script> tags and their code', () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><circle r="2"/></svg>');
    expect(out.toLowerCase()).not.toContain('script');
    expect(out).not.toContain('alert');
  });

  it('removes event handler attributes', () => {
    const out = sanitizeSvg('<svg><rect width="5" height="5" onclick="evil()"/></svg>');
    expect(out).not.toContain('onclick');
  });

  it('strips remote href references', () => {
    const out = sanitizeSvg('<svg><a href="https://evil.example/x.png"><circle r="1"/></a></svg>');
    expect(out).not.toContain('https://');
  });

  it('removes foreignObject and image tags', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10"><foreignObject>bad</foreignObject><image href="https://evil.example/a.png"/><circle r="1"/></svg>');
    expect(out).not.toContain('foreignObject');
    expect(out).not.toContain('<image');
    expect(out).toContain('circle');
  });

  it('removes style and arbitrary event attributes', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10" width="10" height="10"><rect width="5" height="5" style="fill:url(https://evil.example/x)" onfocus="evil()"/></svg>');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('onfocus');
    expect(out).not.toContain('https://');
    expect(out).not.toContain('<svg viewBox="0 0 10 10" width=');
  });

  it('keeps internal marker arrowheads', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10"><defs><marker id="a" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 Z"/></marker></defs><line x1="0" y1="0" x2="8" y2="8" marker-end="url(#a)"/></svg>');
    expect(out).toContain('marker');
    expect(out).toContain('marker-end');
  });
});

describe('sanitizeSvg — EE circuit primitives', () => {
  it('preserves polygon (op-amp triangle body)', () => {
    const svg = '<svg viewBox="0 0 260 180"><polygon points="60,20 60,160 200,90" fill="none" stroke="black" stroke-width="2"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('<polygon');
    expect(out).toContain('points');
  });

  it('preserves the full op-amp SVG with triangle, marker defs, and text labels', () => {
    const svg = [
      '<svg viewBox="0 0 260 180">',
      '<defs><marker id="ah" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">',
      '<polygon points="0,0 6,3 0,6" fill="black"/></marker></defs>',
      '<polygon points="60,20 60,160 200,90" fill="none" stroke="black" stroke-width="2"/>',
      '<text x="70" y="70" font-size="14">+</text>',
      '<text x="70" y="120" font-size="14">\u2212</text>',
      '<line x1="200" y1="90" x2="240" y2="90" stroke="black" stroke-width="2" marker-end="url(#ah)"/>',
      '<text x="210" y="82" font-size="12">Vout</text>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('<polygon');
    expect(out).toContain('marker');
    expect(out).toContain('marker-end');
    expect(out).toContain('<text');
    expect(out).toContain('+');
    expect(out).toContain('Vout');
    expect(out).toContain('<line');
  });

  it('preserves diode triangle-line symbol (polygon + line)', () => {
    const svg = [
      '<svg viewBox="0 0 300 160">',
      '<polygon points="120,18 120,42 150,30" fill="none" stroke="black" stroke-width="2"/>',
      '<line x1="150" y1="18" x2="150" y2="42" stroke="black" stroke-width="2"/>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('<polygon');
    expect(out).toContain('<line');
  });

  it('preserves path elements (waveform curves)', () => {
    const svg = '<svg viewBox="0 0 300 120"><path d="M20,100 Q55,10 90,100" fill="none" stroke="blue" stroke-width="2"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('<path');
    expect(out).toContain('d=');
  });

  it('preserves rect elements (resistor boxes)', () => {
    const svg = '<svg viewBox="0 0 200 100"><rect x="30" y="22" width="60" height="16" fill="none" stroke="black" stroke-width="2"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('<rect');
  });

  it('preserves circle elements (AC source symbol)', () => {
    const svg = '<svg viewBox="0 0 200 200"><circle cx="30" cy="80" r="18" fill="none" stroke="black" stroke-width="2"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('<circle');
  });

  it('preserves defs with marker and polygon arrowheads', () => {
    const svg = [
      '<svg viewBox="0 0 200 200">',
      '<defs><marker id="arr" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">',
      '<polygon points="0,0 4,2 0,4" fill="black"/></marker></defs>',
      '<line x1="10" y1="10" x2="100" y2="100" marker-end="url(#arr)"/>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('<defs>');
    expect(out).toContain('<marker');
    expect(out).toContain('<polygon');
    expect(out).toContain('marker-end');
  });
});

describe('sanitizeSvg preserveInlineStyles', () => {
  it('keeps safe inline fill/stroke styles for mermaid output', () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><rect width="5" height="5" style="fill:#edf2ff;stroke:#333"/></svg>',
      { preserveInlineStyles: true },
    );
    expect(out).toContain('style=');
    expect(out).toContain('fill:#edf2ff');
    expect(out).not.toContain('https://');
  });

  it('still strips dangerous inline styles when preserving mermaid styles', () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><rect width="5" height="5" style="fill:url(https://evil.example/x)"/></svg>',
      { preserveInlineStyles: true },
    );
    expect(out).not.toContain('https://');
    expect(out).not.toMatch(/style\s*=\s*["'][^"']*url\(/i);
  });
});

describe('extractSvg', () => {
  it('pulls the svg element out of surrounding text', () => {
    expect(extractSvg('noise <svg><circle r="1"/></svg> more')).toBe('<svg><circle r="1"/></svg>');
  });
});
