import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '@/src/protocol/types';
import { StepCard } from './StepCard';
import { SolutionView } from './SolutionView';
import { Report } from './Report';
import { MathMarkdown } from './MathMarkdown';
import { prepareMathForRender } from '@/src/lib/math-content';

const session: Session = {
  id: 'math-heading', createdAt: 1, updatedAt: 1, platform: 'gemini', raw: '',
  question: 'Explain the expression.',
  capsule: {
    meta: { version: 2, subject: 'Math', topic: 'Algebra' },
    steps: [{ id: 's1', index: 1, title: 'Use $w^m = 1$ to simplify', body: 'Factor the numerator.' }],
    solution: 'The factors cancel.', solutionDiagrams: [],
  },
};

describe('mathematical headings', () => {
  it.each([
    ['step card', () => <StepCard session={session} index={0} theme="light" />, '.slm-card-title'],
    ['solution', () => <SolutionView session={session} theme="light" />, '.slm-solution-step-title'],
    ['report', () => <Report session={session} diagramSvg={{}} />, '.slm-report-step-title'],
  ] as const)('typesets math within the %s heading', (_label, render, selector) => {
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(render());
    const heading = root.querySelector(selector)!;
    expect(heading.querySelector('math')).not.toBeNull();
    expect(heading.querySelector('annotation')?.textContent).toBe('w^m = 1');
    expect(heading.querySelector('p, div')).toBeNull();
    expect(heading.textContent).toContain('to simplify');
  });
});

describe('fraction structure preservation', () => {
  it.each([
    String.raw`The ratio is $\frac{z - z^7}{1 - z}$.`,
    String.raw`The ratio is $\frac{a^n - b^m}{c + d}$.`,
    String.raw`The ratio is $\frac{1 - x^{k+1}}{1 - x}$.`,
  ])('preserves complete numerator and denominator in %s', (content) => {
    expect(prepareMathForRender(content)).toBe(content);
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(<MathMarkdown content={content} />);
    expect(root.querySelectorAll('mfrac')).toHaveLength(1);
    expect(root.querySelector('annotation')?.textContent).toBe(content.split('$')[1]);
    const fraction = root.querySelector('mfrac')!;
    expect(fraction.children).toHaveLength(2);
    expect(fraction.children[0]?.textContent).toContain('−');
    expect(fraction.children[1]?.textContent).toMatch(/[−+]/);
  });
});
