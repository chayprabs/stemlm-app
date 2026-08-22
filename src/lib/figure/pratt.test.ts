import { describe, it, expect } from 'vitest';
import { compileExpr, evaluateExpr, ExprError } from './pratt';

describe('in-house Pratt evaluator', () => {
  it('evaluates the screenshot kinematics fn at t=10 as 130', () => {
    expect(evaluateExpr('1.5*t^2 - 2*t', { t: 10 })).toBe(130);
    expect(evaluateExpr('1.5*t^2-2*t', { t: 0 })).toBe(0);
  });

  it('handles unary minus, functions, and implicit multiplication', () => {
    expect(evaluateExpr('-sin(pi/2)', {})).toBeCloseTo(-1, 10);
    expect(evaluateExpr('2t', { t: 4 })).toBe(8);
    expect(evaluateExpr('sqrt(t^2)', { t: 9 })).toBe(9);
  });

  it('never uses Function and rejects unknown identifiers', () => {
    expect(() => evaluateExpr('nope(1)', {})).toThrow(ExprError);
    expect(() => compileExpr('1 + ')({ })).toThrow();
  });
});
