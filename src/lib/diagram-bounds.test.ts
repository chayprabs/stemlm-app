import { describe, expect, it } from 'vitest';
import { computeDisplaySize, getDisplayScale, MAX_DIAGRAM_UPSCALE } from './diagram-bounds';

describe('diagram-bounds', () => {
  it('parses viewBox dimensions', () => {
    expect(computeDisplaySize('0 0 520 260', 'step').width).toBe(300);
  });

  it('scales wide diagrams down to compact step profile bounds', () => {
    const size = computeDisplaySize('0 0 520 260', 'step');
    expect(size.width).toBe(300);
    expect(size.height).toBe(150);
  });

  it('scales tall diagrams down to step profile bounds', () => {
    const size = computeDisplaySize('0 0 200 400', 'step');
    expect(size.width).toBe(83);
    expect(size.height).toBe(165);
  });

  it('uses larger print profile than panel step', () => {
    const panel = computeDisplaySize('0 0 520 260', 'step');
    const pdf = computeDisplaySize('0 0 520 260', 'print');
    expect(pdf.width).toBeGreaterThan(panel.width);
    expect(pdf.height).toBeGreaterThan(panel.height);
    expect(pdf.width).toBe(480);
    expect(pdf.height).toBe(240);
  });

  it('does not upscale small diagrams in panel profiles', () => {
    const size = computeDisplaySize('0 0 120 80', 'step');
    expect(size.width).toBe(120);
    expect(size.height).toBe(80);
    expect(MAX_DIAGRAM_UPSCALE.step).toBe(1);
  });

  it('may modestly upscale small diagrams for print only', () => {
    expect(getDisplayScale('0 0 120 80', 'print')).toBe(1.15);
    const size = computeDisplaySize('0 0 120 80', 'print');
    expect(size.width).toBe(138);
    expect(size.height).toBe(92);
  });
});
