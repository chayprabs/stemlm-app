import { describe, expect, it } from 'vitest';
import { dedupeComposerMath, hasComposerMathDuplicates } from './composer-text';
import { cpuMs } from './cpu-time';

describe('composer extraction work budget', () => {
  it('preserves a long unbroken token without repeatedly rescanning its suffixes', () => {
    const input = 'a'.repeat(120_000);
    const start = cpuMs();
    expect(dedupeComposerMath(input)).toBe(input);
    expect(hasComposerMathDuplicates(input)).toBe(false);
    const elapsed = cpuMs() - start;
    console.log(`COMPOSER_TOKEN_MS=${elapsed.toFixed(1)}`);
    expect(elapsed).toBeLessThan(1000);
  });
});
