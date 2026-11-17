import { describe, expect, it } from 'vitest';
import { compileExpr } from '../pratt';
import { cpuMs } from '../../cpu-time';
import {
  evaluateConstant, freeVariables, inferVariable, isUsableExpression, repairExpression, repairNumber, repairRange,
} from './expr-repair';

const SAMPLES = [-2.3, -0.4, 0.37, 1.3, 4.1];

function sameCurve(a: string, b: string, variable = 'x'): boolean {
  const fa = compileExpr(a);
  const fb = compileExpr(b);
  return SAMPLES.every((value) => {
    const ya = fa({ [variable]: value });
    const yb = fb({ [variable]: value });
    return (Number.isNaN(ya) && Number.isNaN(yb)) || Math.abs(ya - yb) <= 1e-9 * Math.max(1, Math.abs(ya));
  });
}

describe('repairExpression', () => {
  it('leaves an expression the evaluator already reads exactly as written', () => {
    for (const source of ['x^2', '2x', '2(x+1)', 'sin(x)', 'e^x', 'x**2', '-x^2 + 3x - 1', '2sin(x)', 'exp(-x/2)*cos(3*x)', 'sqrt(abs(x))', '1/2x', 'pi*x', 'max(x, 0)', '2^-x', '(x+1)(x-1)']) {
      expect(repairExpression(source), source).toBe(source);
    }
  });

  for (const [source, expected] of [
    ['y = x^2', 'x^2'],
    ['f(x) = 2x + 1', '2*x + 1'],
    ['x²', 'x^2'],
    ['x³ − 2x', 'x^3 - 2*x'],
    ['x⁻²', 'x^(-2)'],
    ['√x', 'sqrt(x)'],
    ['√(x+1)', 'sqrt(x + 1)'],
    ['|x|', 'abs(x)'],
    ['|x - 2| + |x|', 'abs(x - 2) + abs(x)'],
    ['2|x|', '2*abs(x)'],
    ['||x| - 1|', 'abs(abs(x) - 1)'],
    ['3·x', '3*x'],
    ['3×x÷2', '3*x/2'],
    ['x(x-1)', 'x*(x - 1)'],
    ['(x+1)(x−1)', '(x + 1)*(x - 1)'],
    ['2 pi x', '2*pi*x'],
    ['2πx', '2*pi*x'],
    ['sin x', 'sin(x)'],
    ['sin 2x', 'sin(2*x)'],
    ['sinx', 'sin(x)'],
    ['x sin x', 'x*sin(x)'],
    ['sin x cos x', 'sin(x)*cos(x)'],
    ['sin^2(x)', 'sin(x)^2'],
    ['sin²x', 'sin(x)^2'],
    ['sin^-1(x)', 'asin(x)'],
    ['arctan(x)', 'atan(x)'],
    ['ln x', 'ln(x)'],
    ['log_2(x)', 'log2(x)'],
    ['log_3(x)', 'ln(x)/ln(3)'],
    ['sec(x)', '1/cos(x)'],
    ['cot x', 'cos(x)/sin(x)'],
    ['e^{-x}', 'e^(-x)'],
    ['\\frac{1}{x}', '1/x'],
    ['\\frac{x+1}{x-1}', '(x + 1)/(x - 1)'],
    ['\\sqrt{x^2+1}', 'sqrt(x^2 + 1)'],
    ['\\sin(x) \\cdot \\cos(x)', 'sin(x)*cos(x)'],
    ['\\left( x + 1 \\right)^{2}', '(x + 1)^2'],
    ['2\\pi x', '2*pi*x'],
    ['$x^2 - 4$', 'x^2 - 4'],
    ['\\frac{1}{2}x^{2}\\,+\\,3', '1/2*x^2 + 3'],
    ['sin(30°)', 'sin(30*pi/180)'],
    ['Math.sin(x)', 'sin(x)'],
    ['pow(x, 3)', 'x^3'],
    ['½x²', '1/2*x^2'],
    ['2.x', '2*x'],
  ] as const) {
    it(`rewrites ${source}`, () => {
      const repaired = repairExpression(source);
      expect(repaired).toBe(expected);
      expect(isUsableExpression(repaired!)).toBe(true);
    });
  }

  it('keeps the value of every rewrite that has an evaluator-readable twin', () => {
    for (const [source, twin] of [
      ['x(x-1)', 'x*x - x'], ['sin 2x', 'sin(2*x)'], ['\\frac{x+1}{x-1}', '(x+1)/(x-1)'], ['|x - 2|', 'abs(x-2)'],
      ['x⁻²', '1/x^2'], ['sin²x', 'sin(x)*sin(x)'], ['log_3(x)', 'ln(x)/ln(3)'], ['2 pi x', '2*pi*x'], ['-x²', '-(x*x)'],
    ] as const) {
      expect(sameCurve(repairExpression(source)!, twin), source).toBe(true);
    }
  });

  it('reads a function of another declared variable', () => {
    expect(repairExpression('3t² + 2t', 't')).toBe('3*t^2 + 2*t');
    expect(repairExpression('v_0 sin(v_0)', 'v_0')).toBe('v_0*sin(v_0)');
    expect(repairExpression('v(t) = 3t', 't')).toBe('3*t');
  });

  it('refuses notation it cannot read without guessing', () => {
    for (const source of [
      'sin x (x+1)', 'x = 2', 'x!', 'a x^2', '\\int x dx', '\\sqrt[3]{x}', 'x^2 if x > 0', 'y = x = 2', 'f(t) = t^2', 'x^', '(x+1', '', '   ', 'x'.repeat(600),
    ]) {
      expect(repairExpression(source), source).toBeNull();
    }
  });

  it('never throws and stays fast on hostile input', () => {
    const hostile = ['('.repeat(400), '\\frac{'.repeat(200), '|'.repeat(500), '√'.repeat(500), '^'.repeat(500), 'sin '.repeat(120), '-'.repeat(510), '²'.repeat(500), '\u0000￿{}[]'];
    const started = cpuMs();
    for (const source of hostile) expect(() => repairExpression(source)).not.toThrow();
    expect(cpuMs() - started).toBeLessThan(500);
  });
});

describe('variables', () => {
  it('lists the names the evaluator would look up', () => {
    expect([...freeVariables('2x + sinx')!]).toEqual(['x', 'sinx']);
    expect(freeVariables('x(')).toBeNull();
  });

  it('infers the single variable a function is written in', () => {
    expect(inferVariable('3t^2 + 1')).toBe('t');
    expect(inferVariable('sin(theta)')).toBe('theta');
    expect(inferVariable('A sin t')).toBeNull();
    expect(inferVariable('5')).toBeNull();
    expect(inferVariable('sint')).toBe('t');
  });
});

describe('repairRange', () => {
  for (const [source, expected] of [
    ['-3 to 3', '-3 3'], ['[-3, 3]', '-3 3'], ['(-3,3)', '-3 3'], ['-3..3', '-3 3'], ['-3 <= x <= 3', '-3 3'],
    ['x from -3 to 3', '-3 3'], ['x ∈ [0, 2π]', '0 6.28318530718'], ['−π to π', '-3.14159265359 3.14159265359'],
    ['0 ≤ t ≤ 10', '0 10'], ['min=-3 max=3', '-3 3'], ['xmin: 0, xmax: 5', '0 5'], ['from 0 to 2*pi', '0 6.28318530718'],
    ['-3 – 3', '-3 3'], ['0:10', '0 10'], ['-3 3', '-3 3'], ['[0, 1e3]', '0 1000'], ['-pi/2 to pi/2', '-1.57079632679 1.57079632679'],
  ] as const) {
    it(`reads ${source}`, () => expect(repairRange(source)).toBe(expected));
  }

  it('refuses anything but two finite increasing bounds', () => {
    for (const source of ['3 to -3', '0', '0 to', 'a to b', '0, 1, 2', 'all real numbers', '0 to infinity', '']) {
      expect(repairRange(source), source).toBeNull();
    }
  });
});

describe('repairNumber and constants', () => {
  it('normalises a single number and keeps its unit', () => {
    expect(repairNumber('−12')).toBe('-12');
    expect(repairNumber('12,5 cm')).toBe('12.5 cm');
    expect(repairNumber('1,250,000')).toBe('1250000');
    expect(repairNumber('30°')).toBe('30°');
  });

  it('leaves an ambiguous or non-numeric value alone', () => {
    for (const source of ['1,000', 'ten', '1,2,3', '3 4', '']) expect(repairNumber(source), source).toBeNull();
  });

  it('evaluates constant expressions only', () => {
    expect(evaluateConstant('2π')).toBeCloseTo(2 * Math.PI, 10);
    expect(evaluateConstant('x')).toBeNull();
    expect(evaluateConstant('1/0')).toBeNull();
  });
});
