import { describe, expect, it } from 'vitest';
import { parseSpec } from './spec';

describe('figure spec input budget', () => {
  it('rejects oversized raw specs before splitting or accumulating entries', () => {
    const oversized = `node: ${'A'.repeat(70_000)}`;
    expect(oversized.length).toBeGreaterThan(64_000);
    expect(() => parseSpec('graph', oversized)).toThrow('spec input exceeds the maximum size');
  });
});
