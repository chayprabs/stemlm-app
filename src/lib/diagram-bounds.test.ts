import { describe, expect, it } from 'vitest';
import { computeDisplaySize, parseViewBox } from './diagram-bounds';

describe('diagram-bounds', () => {
  it('parses viewBox dimensions', () => {
    expect(parseViewBox('0 0 520 260')).toEqual({ x: 0, y: 0, w: 520, h: 260 });
    expect(parseViewBox(null)).toBeNull();
  });

  it('scales wide diagrams down to step profile bounds', () => {
    const size = computeDisplaySize('0 0 520 260', 'step');
    expect(size.width).toBe(248);
    expect(size.height).toBe(124);
  });

  it('scales tall diagrams down to step profile bounds', () => {
    const size = computeDisplaySize('0 0 200 400', 'step');
    expect(size.width).toBe(66);
    expect(size.height).toBe(132);
  });

  it('uses print profile for PDF output', () => {
    const size = computeDisplaySize('0 0 520 260', 'print');
    expect(size.width).toBe(280);
    expect(size.height).toBe(140);
  });

  it('does not upscale small diagrams', () => {
    const size = computeDisplaySize('0 0 120 80', 'step');
    expect(size.width).toBe(120);
    expect(size.height).toBe(80);
  });
});
