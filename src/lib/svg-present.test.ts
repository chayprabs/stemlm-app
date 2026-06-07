import { describe, it, expect } from 'vitest';
import { decodeSvgText, presentSvg } from './svg-present';

describe('decodeSvgText', () => {
  it('converts common LaTeX unit fragments to Unicode', () => {
    expect(decodeSvgText('R = 10 \\Omega')).toBe('R = 10 Ω');
    expect(decodeSvgText('C = 100 \\mu F')).toBe('C = 100 µF');
    expect(decodeSvgText('$X_L = 18.85 \\Omega$')).toBe('X_L = 18.85 Ω');
  });
});

describe('presentSvg', () => {
  const sample =
    '<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="10" y1="40" x2="180" y2="40" stroke="#333" stroke-width="2"/>' +
    '<text x="90" y="20" fill="#333">R = 10 \\Omega</text>' +
    '</svg>';

  it('retints neutral strokes for dark theme and decodes label text', () => {
    const out = presentSvg(sample, 'dark');
    expect(out).toContain('data-stemlm-theme="dark"');
    expect(out).toContain('stroke="#cbd5e1"');
    expect(out).toContain('fill="#e2e8f0"');
    expect(out).toContain('R = 10 Ω');
    expect(out).not.toContain('\\Omega');
  });

  it('keeps readable neutral strokes in light theme', () => {
    const out = presentSvg(sample, 'light');
    expect(out).toContain('data-stemlm-theme="light"');
    expect(out).toContain('stroke="#334155"');
    expect(out).toContain('fill="#1e293b"');
  });

  it('themes text without an explicit fill attribute', () => {
    const raw =
      '<svg viewBox="0 0 200 80"><text x="10" y="20">R = 10 Ω</text></svg>';
    const dark = presentSvg(raw, 'dark');
    const light = presentSvg(raw, 'light');
    expect(dark).toContain('fill="#e2e8f0"');
    expect(light).toContain('fill="#1e293b"');
  });

  it('themes black label text and blue accent labels for dark mode', () => {
    const raw =
      '<svg viewBox="0 0 240 120">' +
      '<line x1="10" y1="60" x2="180" y2="60" stroke="black" stroke-width="2"/>' +
      '<text x="40" y="20" fill="black">R = 10 Ω</text>' +
      '<text x="120" y="100" fill="blue">|Z| = 12.61 Ω</text>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).toContain('fill="#e2e8f0"');
    expect(out).toContain('stroke="#cbd5e1"');
    expect(out).toContain('fill="#60a5fa"');
    expect(out).not.toContain('fill="black"');
  });

  it('darkens light label text in light mode', () => {
    const raw =
      '<svg viewBox="0 0 200 40"><text x="10" y="20" fill="#ffffff">R = 10 Ω</text></svg>';
    const out = presentSvg(raw, 'light');
    expect(out).toContain('fill="#1e293b"');
    expect(out).not.toContain('fill="#ffffff"');
  });

  it('sets proportional display dimensions from viewBox', () => {
    const raw =
      '<svg width="900" height="400" viewBox="0 0 520 260"><rect width="10" height="10"/></svg>';
    const out = presentSvg(raw, 'light', 'step');
    expect(out).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(out).toContain('viewBox="0 0 520 260"');
    expect(out).toContain('width="248"');
    expect(out).toContain('height="124"');
  });

  it('uses print profile dimensions and inline style for PDF output', () => {
    const raw = '<svg viewBox="0 0 520 260"><rect width="10" height="10"/></svg>';
    const out = presentSvg(raw, 'light', 'print');
    expect(out).toContain('width="200"');
    expect(out).toContain('height="100"');
    expect(out).toContain('style="display:block;width:200px;height:100px;max-width:100%;"');
  });

  it('syncs marker fills to themed line strokes in dark mode', () => {
    const raw =
      '<svg viewBox="0 0 240 120">' +
      '<defs><marker id="ah" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">' +
      '<polygon points="0,0 6,3 0,6" fill="white"/></marker></defs>' +
      '<line x1="20" y1="60" x2="180" y2="60" stroke="#3b82f6" stroke-width="2" marker-end="url(#ah)"/>' +
      '<text x="70" y="30" fill="#3b82f6">G = 0.05</text>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).toContain('fill="#60a5fa"');
    expect(out).not.toContain('fill="white"');
    expect(out).toMatch(/marker-end="url\(#slm[^"]+-ah\)"/);
  });

  it('clones markers when one id is shared by differently colored vectors', () => {
    const raw =
      '<svg viewBox="0 0 340 260">' +
      '<defs><marker id="tri" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">' +
      '<polygon points="0,0 6,3 0,6" fill="#333"/></marker></defs>' +
      '<line x1="50" y1="40" x2="170" y2="40" stroke="#d32f2f" stroke-width="2" marker-end="url(#tri)"/>' +
      '<line x1="170" y1="40" x2="170" y2="220" stroke="#2e7d32" stroke-width="2" marker-end="url(#tri)"/>' +
      '<line x1="50" y1="40" x2="170" y2="220" stroke="#7b1fa2" stroke-width="2.5" marker-end="url(#tri)"/>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    const markerEnds = [...out.matchAll(/marker-end="url\(#([^)]+)\)"/g)].map((m) => m[1]);
    expect(new Set(markerEnds).size).toBe(3);
    expect(out).toContain('fill="#f87171"');
    expect(out).toContain('fill="#4ade80"');
    expect(out).toContain('fill="#c084fc"');
  });

  it('prefixes ids so two diagrams on the same page cannot cross-reference markers', () => {
    const raw =
      '<svg viewBox="0 0 120 60">' +
      '<defs><marker id="arw" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">' +
      '<polygon points="0,0 6,3 0,6" fill="black"/></marker></defs>' +
      '<line x1="10" y1="30" x2="100" y2="30" stroke="#333" stroke-width="2" marker-end="url(#arw)"/>' +
      '</svg>';
    const a = presentSvg(raw, 'dark');
    const b = presentSvg(raw, 'dark');
    const idA = a.match(/id="(slm[^"]+-arw)"/)?.[1];
    const idB = b.match(/id="(slm[^"]+-arw)"/)?.[1];
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(a).toContain(`marker-end="url(#${idA})"`);
    expect(b).toContain(`marker-end="url(#${idB})"`);
  });

  it('normalizes star-like marker polygons to a triangle arrowhead', () => {
    const raw =
      '<svg viewBox="0 0 120 60">' +
      '<defs><marker id="bad" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">' +
      '<polygon points="5,0 6,4 10,5 6,6 5,10 4,6 0,5 4,4" fill="white"/></marker></defs>' +
      '<line x1="10" y1="30" x2="100" y2="30" stroke="#16a34a" stroke-width="2" marker-end="url(#bad)"/>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).toContain('points="0,0 6,3 0,6"');
    expect(out).toContain('fill="#4ade80"');
    expect(out).not.toContain('points="5,0 6,4');
  });
});
