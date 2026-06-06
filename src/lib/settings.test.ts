import { describe, it, expect } from 'vitest';
import { clampSplitRatio, DEFAULT_SETTINGS } from './settings';

describe('clampSplitRatio', () => {
  const wide = 1600;

  it('keeps values within [0.25, 0.75] on wide viewports', () => {
    expect(clampSplitRatio(0.5, wide)).toBe(0.5);
    expect(clampSplitRatio(0.1, wide)).toBe(0.25);
    expect(clampSplitRatio(0.9, wide)).toBe(0.75);
    expect(clampSplitRatio(0.25, wide)).toBe(0.25);
    expect(clampSplitRatio(0.75, wide)).toBe(0.75);
  });

  it('falls back to 0.5 for non-finite input', () => {
    expect(clampSplitRatio(NaN, wide)).toBe(0.5);
    expect(clampSplitRatio(Infinity, wide)).toBe(0.5);
  });

  it('default split is 50/50', () => {
    expect(DEFAULT_SETTINGS.splitRatio).toBe(0.5);
  });

  it('defaults to the balanced prompt variant', () => {
    expect(DEFAULT_SETTINGS.promptVariant).toBe('balanced');
  });
});
