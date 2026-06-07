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
