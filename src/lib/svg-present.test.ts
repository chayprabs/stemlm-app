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
});
