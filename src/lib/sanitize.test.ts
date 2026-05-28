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
});

describe('extractSvg', () => {
  it('pulls the svg element out of surrounding text', () => {
    expect(extractSvg('noise <svg><circle r="1"/></svg> more')).toBe('<svg><circle r="1"/></svg>');
  });
});
