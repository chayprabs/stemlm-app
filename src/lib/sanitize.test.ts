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

describe('extractSvg', () => {
  it('pulls the svg element out of surrounding text', () => {
    expect(extractSvg('noise <svg><circle r="1"/></svg> more')).toBe('<svg><circle r="1"/></svg>');
  });
});
