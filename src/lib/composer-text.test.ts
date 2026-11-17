import { describe, it, expect } from 'vitest';
import { dedupeComposerMath, hasComposerMathDuplicates, normalizeComposerText } from './composer-text';

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
  it('MATH-01 preserves distinct assignments across prose, for any symbol and value', () => {
    for (const symbol of ['T', 'R', 'E', 'Q', 'H']) {
      for (const gap of [' and ', '. The next quantity is ', ' for the first trial and then ']) {
        for (const value of [17, 83, 301]) {
          const source = `${symbol}=${value}${gap}${symbol}_c = ${value + 5}`;
          expect(dedupeComposerMath(source)).toBe(source);
        }
      }
    }
  });

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

  it('drops a glyph copy that trails the LaTeX it repeats, and nothing else', () => {
    expect(dedupeComposerMath('Source V_s = 48 Vs=48 V is connected.')).toBe('Source V_s = 48 V is connected.');
    expect(dedupeComposerMath('R_1 = 6\\ \\Omega R1=6 Ω in series')).toBe('R_1 = 6\\ \\Omega in series');
    expect(dedupeComposerMath('V_{x} = 2I_3 Vx=2I3, then stop')).toBe('V_{x} = 2I_3, then stop');
    expect(dedupeComposerMath('V_s = 48 Vs=48 and R_1 = 6 R1=6')).toBe('V_s = 48 and R_1 = 6');
  });

  it('never deletes text after a subscripted assignment unless it is an exact repeat', () => {
    for (const source of [
      'x_1 = 5 and x2=7 are given.',
      'R_1 = 2 ohm and R2=3 ohm in series.',
      'R_1 = 2 and V=12',
      'a_1 = 2 and a=3 are the first terms',
      'x_1 = 5 and x1=7 differ',
      'V_s = 48 Vs=485 mV',
      'V_s = 48 V Vs=48',
      'T_c = 273 K, so Tc=273.15 K exactly',
      'x_1 = 5 x1= 6',
    ]) {
      expect(dedupeComposerMath(source)).toBe(source);
      expect(normalizeComposerText(source)).toBe(source);
    }
  });

  it('handles dependent source duplication Vx=2I3V_x = 2I_3', () => {
    const raw = 'Vx=2I3V_x = 2I_3';
    const out = normalizeComposerText(raw);
    expect(out).not.toContain('Vx=2I3');
    expect(out).toContain('V_x = 2I_3');
  });
});
