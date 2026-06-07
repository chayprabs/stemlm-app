import { describe, it, expect } from 'vitest';
import { hasComposerMathDuplicates, normalizeComposerText } from './composer-text';

describe('hasComposerMathDuplicates', () => {
  it('detects glued compact + subscript copies only', () => {
    expect(hasComposerMathDuplicates('Vs=48V_s = 48')).toBe(true);
    expect(hasComposerMathDuplicates('Find the current in this 12V series resistor circuit.')).toBe(
      false,
    );
    expect(hasComposerMathDuplicates('$Y_L$ is inductive reactance')).toBe(false);
  });
});

describe('normalizeComposerText', () => {
  it('removes compact duplicate before subscript form', () => {
    const raw = 'Consider the circuit. A DC voltage source Vs=48V_s = 48 V is connected';
    const out = normalizeComposerText(raw);
    expect(out).not.toContain('Vs=48');
    expect(out).toContain('V_s = 48');
  });

  it('collapses resistor duplicates like R1=6 ΩR_1 = 6\\ \\Omega', () => {
    const raw = 'R1=6 ΩR_1 = 6\\ \\Omega R2=4 ΩR_2 = 4\\ \\Omega';
    const out = normalizeComposerText(raw);
    expect(out).not.toMatch(/R1=6/);
    expect(out).toContain('R_1 = 6');
    expect(out).toContain('R_2 = 4');
    expect(out).not.toContain('\\Omega');
  });

  it('merges spurious line breaks from per-symbol blocks', () => {
    const raw = 'Vs\n=48 V\nis connected';
    const out = normalizeComposerText(raw);
    expect(out).toContain('Vs=48 V');
    expect(out).toContain('is connected');
    expect(out).not.toContain('\n');
  });

  it('is idempotent on clean prose', () => {
    const clean = 'Find the current through R_1 when V_s = 12 V.';
    expect(normalizeComposerText(clean)).toBe(clean);
  });

  it('handles dependent source duplication Vx=2I3V_x = 2I_3', () => {
    const raw = 'Vx=2I3V_x = 2I_3';
    const out = normalizeComposerText(raw);
    expect(out).not.toContain('Vx=2I3');
    expect(out).toContain('V_x = 2I_3');
  });
});
