import { describe, it, expect } from 'vitest';
import { clampSplitRatio, DEFAULT_SETTINGS } from './settings';

describe('clampSplitRatio', () => {
  it('keeps values within [0.25, 0.75]', () => {
    expect(clampSplitRatio(0.5)).toBe(0.5);
    expect(clampSplitRatio(0.1)).toBe(0.25);
    expect(clampSplitRatio(0.9)).toBe(0.75);
    expect(clampSplitRatio(0.25)).toBe(0.25);
    expect(clampSplitRatio(0.75)).toBe(0.75);
  });

  it('falls back to 0.5 for non-finite input', () => {
    expect(clampSplitRatio(NaN)).toBe(0.5);
    expect(clampSplitRatio(Infinity)).toBe(0.5);
  });

  it('default split is 50/50', () => {
    expect(DEFAULT_SETTINGS.splitRatio).toBe(0.5);
  });
});
