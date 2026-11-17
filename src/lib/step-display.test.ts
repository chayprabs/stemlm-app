import { describe, expect, it } from 'vitest';
import { resolveStepWorkText, shouldShowFormulaBlock } from './step-display';
import type { Step } from '@/src/protocol/types';

const base: Step = {
  id: 's1',
  index: 2,
  title: 'Calculate inductive reactance',
  body: '',
  formula: '$$X_L = \\omega L = 377 \\times 0.2 = 75.4\\,\\Omega$$',
};

describe('resolveStepWorkText', () => {
  it('returns body when present', () => {
    expect(
      resolveStepWorkText({ ...base, body: '$X_L$ is inductive reactance. $X_L=75.4\\,\\Omega$.' }),
    ).toContain('inductive reactance');
  });

  it('falls back to worked formula when body is empty', () => {
    expect(resolveStepWorkText(base)).toContain('75.4');
  });

  it('treats missing body as empty', () => {
    expect(resolveStepWorkText({ ...base, body: undefined as unknown as string })).toContain('75.4');
  });

  it('ignores diagnostic body and falls back to worked formula', () => {
    expect(
      resolveStepWorkText({
        ...base,
        body: 'Step 2 ("Calculate inductive reactance") has no @body — add symbol definitions and the worked calculation.',
      }),
    ).toContain('75.4');
  });
});

describe('shouldShowFormulaBlock', () => {
  it('hides formula when work duplicates the same math', () => {
    expect(shouldShowFormulaBlock(base)).toBe(false);
  });

  it('shows formula when body adds separate explanation', () => {
    expect(
      shouldShowFormulaBlock({
        ...base,
        body: '$X_L$ is inductive reactance. $X_L=75.4\\,\\Omega$.',
      }),
    ).toBe(true);
  });
});

describe('shouldShowFormulaBlock when the body already displays the equation', () => {
  const formula = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
  const step = (body: string, tex = formula): Step => ({ id: 's1', index: 1, title: 'Apply the formula', body, formula: tex });

  it('hides the block when the body sets the same equation as display math', () => {
    const body = ['We use the quadratic formula:', '$$', formula, '$$', 'which gives two roots.'].join('\n\n');
    expect(shouldShowFormulaBlock(step(body))).toBe(false);
  });

  it('compares the equation without delimiters or spacing, however either side wrote it', () => {
    const body = 'Substituting:\n\n\\[ x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a} \\]\n\nso the roots follow.';
    expect(shouldShowFormulaBlock(step(body))).toBe(false);
    expect(shouldShowFormulaBlock(step(body, '$$' + formula + '$$'))).toBe(false);
    expect(shouldShowFormulaBlock(step('Start from:\n\n$$' + formula + '$$', '\\[\n' + formula + '\n\\]'))).toBe(false);
  });

  it('hides the block for an environment the body carries without delimiters', () => {
    const aligned = '\\begin{aligned}\nx &= 4 - 1 \\\\[2pt]\n&= 3\n\\end{aligned}';
    expect(shouldShowFormulaBlock(step('Then, step by step,\n\n' + aligned + '\n\nwhich is the root.', aligned))).toBe(false);
  });

  it('reads past a line break with spacing to the display equation after it', () => {
    const body = 'First\n\n$$a \\\\[4pt] b$$\n\nthen\n\n\\[' + formula + '\\]';
    expect(shouldShowFormulaBlock(step(body))).toBe(false);
  });

  it('keeps the block when the body only uses the equation inline or inside a longer chain', () => {
    expect(shouldShowFormulaBlock(step('Newton gives $F = ma$ for the block.', 'F = ma'))).toBe(true);
    expect(shouldShowFormulaBlock(step('So:\n\n$$F = ma = 2 \\times 3 = 6\\,\\text{N}$$', 'F = ma'))).toBe(true);
  });

  it('keeps the block when the body displays a different equation', () => {
    expect(shouldShowFormulaBlock(step('The discriminant is\n\n$$\\Delta = b^2 - 4ac$$\n\nwhich is positive.'))).toBe(true);
  });

  it('stays quick and keeps the block on a wall of unclosed delimiters', () => {
    const hostile = '\\[ x '.repeat(40_000) + '$$ y '.repeat(20_001);
    const started = Date.now();
    expect(shouldShowFormulaBlock(step(hostile))).toBe(true);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
