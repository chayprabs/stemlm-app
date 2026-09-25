import { describe, expect, it } from 'vitest';
import { computeDisplaySize, parseViewBox } from './diagram-bounds';

describe('offset SVG view boxes', () => {
  it('treats the last two values as dimensions, independent of origin', () => {
    expect(parseViewBox('-30 25 300 165')).toEqual({ x: -30, y: 25, w: 300, h: 165 });
    expect(computeDisplaySize('-30 25 300 165', 'step')).toEqual(computeDisplaySize('0 0 300 165', 'step'));
  });

  it('requires exactly four finite values and positive dimensions', () => {
    for (const box of ['0 0 Infinity 100', '0 0 100 100 20', '0 0 -2 3']) {
      expect(parseViewBox(box)).toBeNull();
    }
  });
});
