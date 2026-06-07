import { describe, expect, it } from 'vitest';
import { computeDisplaySize, getDisplayScale, parseViewBox } from './diagram-bounds';

describe('diagram-bounds', () => {
  it('parses viewBox dimensions', () => {
    expect(parseViewBox('0 0 520 260')).toEqual({ x: 0, y: 0, w: 520, h: 260 });
    expect(parseViewBox(null)).toBeNull();
  });

  it('scales wide diagrams down to step profile bounds', () => {
    const size = computeDisplaySize('0 0 520 260', 'step');
    expect(size.width).toBe(480);
    expect(size.height).toBe(240);
  });

  it('scales tall diagrams down to step profile bounds', () => {
    const size = computeDisplaySize('0 0 200 400', 'step');
    expect(size.width).toBe(140);
    expect(size.height).toBe(280);
  });

  it('uses print profile matching panel step size', () => {
    const size = computeDisplaySize('0 0 520 260', 'print');
    expect(size.width).toBe(480);
    expect(size.height).toBe(240);
  });

  it('modestly upscales small diagrams to fill the card', () => {
    const size = computeDisplaySize('0 0 120 80', 'step');
    expect(size.width).toBe(150);
    expect(size.height).toBe(100);
  });

  it('exports display scale for font compensation', () => {
    expect(getDisplayScale('0 0 520 260', 'step')).toBeCloseTo(480 / 520, 5);
    expect(getDisplayScale('0 0 120 80', 'step')).toBe(1.25);
  });
});
