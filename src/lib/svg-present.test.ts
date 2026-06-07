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
    expect(out).toContain('fill="#cbd5e1"');
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
    expect(out).toContain('width="300"');
    expect(out).toContain('height="150"');
  });

  it('uses print profile dimensions and inline style for PDF output', () => {
    const raw = '<svg viewBox="0 0 520 260"><rect width="10" height="10"/></svg>';
    const out = presentSvg(raw, 'light', 'print');
    expect(out).toContain('width="480"');
    expect(out).toContain('height="240"');
    expect(out).toContain('style="display:block;width:480px;height:240px;max-width:100%;"');
  });

  it('compensates text font-size when diagram is scaled down', () => {
    const raw =
      '<svg viewBox="0 0 520 260"><text x="10" y="20" font-size="12">V_3</text></svg>';
    const out = presentSvg(raw, 'light', 'step');
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    const size = Number(doc.querySelector('text')?.getAttribute('font-size'));
    expect(size).toBeGreaterThan(12);
    expect(size).toBeLessThanOrEqual(30);
  });

  it('does not upscale small viewBox diagrams in panel profile', () => {
    const raw = '<svg viewBox="0 0 120 80"><rect width="10" height="10"/></svg>';
    const out = presentSvg(raw, 'light', 'step');
    expect(out).toContain('width="120"');
    expect(out).toContain('height="80"');
  });

  it('spreads labels stacked at the same point', () => {
    const raw =
      '<svg viewBox="0 0 200 120">' +
      '<text x="100" y="60" font-size="12">I_1</text>' +
      '<text x="100" y="60" font-size="12">I_d</text>' +
      '<text x="100" y="60" font-size="12">I_2</text>' +
      '</svg>';
    const out = presentSvg(raw, 'light', 'step');
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    const ys = [...doc.querySelectorAll('text')].map((el) => Number(el.getAttribute('y')));
    expect(new Set(ys).size).toBe(3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10);
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

  const BAD_ADMITTANCE_TRIANGLE =
    '<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">' +
    '<polygon points="0,0 10,5 0,10 3,5" fill="black"/></marker>' +
    '<marker id="arrow2" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">' +
    '<path d="M0,0 L12,6 L0,12 L4,6 Z" fill="#000"/></marker>' +
    '</defs>' +
    '<line x1="40" y1="160" x2="200" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>' +
    '<text x="100" y="150" fill="#3b82f6" font-size="12">G = 0.05</text>' +
    '<line x1="200" y1="160" x2="200" y2="60" stroke="#ffa500" stroke-width="2" marker-end="url(#arrow)"/>' +
    '<text x="210" y="110" fill="#ffa500" font-size="12">j0.025</text>' +
    '<line x1="40" y1="160" x2="200" y2="60" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow2)"/>' +
    '<text x="90" y="100" fill="#16a34a" font-size="12">Y_total</text>' +
    '</svg>';

  it('fixes admittance triangle arrowheads for extension light theme', () => {
    const out = presentSvg(BAD_ADMITTANCE_TRIANGLE, 'light');
    expect(out).not.toContain('userSpaceOnUse');
    expect(out).not.toContain('fill="black"');
    expect(out).not.toContain('fill="#000"');
    expect(out).not.toContain('<path d="M0,0 L12,6');
    expect(out).toContain('markerUnits="strokeWidth"');
    expect(out).toContain('fill="#3b82f6"');
    expect(out).toContain('fill="#ffa500"');
    expect(out).toContain('fill="#16a34a"');
    expect(out).toContain('points="0,0 6,3 0,6"');
    expect(out).toContain('G = 0.05');
    expect(out).toContain('Y_total');
  });

  it('fixes admittance triangle arrowheads for PDF print profile', () => {
    const out = presentSvg(BAD_ADMITTANCE_TRIANGLE, 'light', 'print');
    expect(out).toContain('width="368"');
    expect(out).not.toContain('userSpaceOnUse');
    expect(out).toContain('fill="#16a34a"');
    expect(out).not.toContain('<path ');
  });

  it('keeps marker fill matched to themed neutral stroke after serialize', () => {
    const raw =
      '<svg viewBox="0 0 120 60">' +
      '<defs><marker id="arw" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">' +
      '<polygon points="0,0 6,3 0,6" fill="black"/></marker></defs>' +
      '<line x1="10" y1="30" x2="100" y2="30" stroke="#333" stroke-width="2" marker-end="url(#arw)"/>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).toContain('stroke="#cbd5e1"');
    const markerFill = out.match(/<marker[\s\S]*?<polygon[^>]*fill="([^"]+)"/)?.[1];
    expect(markerFill).toBe('#cbd5e1');
    expect(out).not.toContain('fill="#e2e8f0"');
  });

  it('converts path-based markers to triangle polygons', () => {
    const raw =
      '<svg viewBox="0 0 120 60">' +
      '<defs><marker id="p" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12">' +
      '<path d="M0,0 L12,6 L0,12 L4,6 Z" fill="#000"/></marker></defs>' +
      '<line x1="10" y1="30" x2="100" y2="30" stroke="#3b82f6" stroke-width="2" marker-end="url(#p)"/>' +
      '</svg>';
    const out = presentSvg(raw, 'light');
    expect(out).not.toContain('<path ');
    expect(out).toContain('points="0,0 6,3 0,6"');
    expect(out).toContain('fill="#3b82f6"');
    expect(out).toContain('markerUnits="strokeWidth"');
  });

  it('applies stroke from parent <g> to child shapes without explicit stroke', () => {
    const raw =
      '<svg viewBox="0 0 200 80">' +
      '<g stroke="#222" fill="none">' +
      '<line x1="10" y1="40" x2="180" y2="40"/>' +
      '<rect x="80" y="28" width="40" height="24"/>' +
      '</g></svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).toContain('stroke="#cbd5e1"');
    expect(out).toMatch(/<line[^>]+stroke="#cbd5e1"/);
    expect(out).toMatch(/<rect[^>]+stroke="#cbd5e1"/);
  });

  it('normalizes unreferenced markers in defs', () => {
    const raw =
      '<svg viewBox="0 0 120 60">' +
      '<defs><marker id="orphan" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20">' +
      '<path d="M0,0 L20,10 L0,20 L5,10 Z" fill="black"/></marker></defs>' +
      '<line x1="10" y1="30" x2="100" y2="30" stroke="#3b82f6" stroke-width="2"/>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    expect(out).not.toContain('userSpaceOnUse');
    expect(out).toContain('markerUnits="strokeWidth"');
    expect(out).not.toContain('<path d="M0,0 L20,10');
  });

  it('nudges node labels off horizontal wires when placed on the conductor', () => {
    const raw =
      '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">' +
      '<line x1="80" y1="30" x2="120" y2="30" stroke="#333" stroke-width="2"/>' +
      '<text x="100" y="30" text-anchor="middle" font-size="12">Node A (V_A)</text>' +
      '<rect x="92" y="40" width="16" height="40" stroke="#333" fill="none"/>' +
      '<line x1="80" y1="80" x2="120" y2="80" stroke="#333" stroke-width="2"/>' +
      '<text x="100" y="80" text-anchor="middle" font-size="12">Node B (0V)</text>' +
      '</svg>';
    const out = presentSvg(raw, 'dark');
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    const labels = [...doc.querySelectorAll('text')].map((el) => ({
      text: el.textContent ?? '',
      y: Number(el.getAttribute('y')),
    }));
    const nodeA = labels.find((l) => l.text.includes('Node A'));
    const nodeB = labels.find((l) => l.text.includes('Node B'));
    expect(nodeA?.y).toBeLessThan(30);
    expect(nodeB?.y).toBeGreaterThan(80);
  });

  it('leaves labels that are already offset from wires unchanged', () => {
    const raw =
      '<svg viewBox="0 0 200 80">' +
      '<line x1="10" y1="40" x2="180" y2="40" stroke="#333" stroke-width="2"/>' +
      '<text x="90" y="20" fill="#333">R = 10 Ω</text>' +
      '</svg>';
    const out = presentSvg(raw, 'light');
    expect(out).toContain('y="20"');
    expect(out).toContain('R = 10 Ω');
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
