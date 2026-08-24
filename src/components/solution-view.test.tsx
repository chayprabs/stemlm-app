import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SolutionView } from './SolutionView';
import { parse } from '@/src/protocol/parser';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

const BACK_SUB =
  'Back-substitution yields (1/2)^6 = 1/64, matching the factor 64 in 108 days.';

function buildSession(): Session {
  const result = parse(FENCED_ELECTRICAL);
  return {
    id: 'structural',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Structural fixture question.',
    capsule: result.capsule!,
    raw: '',
  };
}

describe('SolutionView', () => {
  it('renders stacked steps with index marks and diagrams — no question or Full solution appendix', () => {
    const session = buildSession();
    const html = renderToStaticMarkup(<SolutionView session={session} theme="light" />);

    expect(html).not.toContain('Question');
    expect(html).not.toContain('Structural fixture question.');
    expect(html).not.toContain('Step-by-step');
    expect(html).toContain('slm-step-index');
    expect(html).toContain('Label the circuit');
    expect(html).toContain('slm-step-diagram');
    expect(html).not.toContain('Full solution');
    expect(html).not.toContain('slm-solution-full');
    expect(html).toContain('katex');
    expect(session.capsule.steps.some((s) => s.diagram)).toBe(true);
    expect(html).not.toContain('slm-step-id');
  });

  it('hides screenshot verification/uncertainty chrome and s1/s2 chips', () => {
    const session: Session = {
      id: 'sv-half-life',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'A sample has half-life 18 days. After 108 days the radiation factor is 64. Why?',
      raw: '',
      capsule: {
        meta: { version: 2, subject: 'Physics', topic: 'Radioactive decay' },
        solution: 'Six half-lives give remaining fraction 1/64.',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Count the half-lives',
            body: '108 days / 18 days = 6 half-lives.',
          },
          {
            id: 's2',
            index: 2,
            title: 'Apply the decay factor',
            body: 'After 6 half-lives the remaining fraction is $(1/2)^6 = 1/64$.',
          },
        ],
        verification: {
          methods: ['units', 'backsub', 'oom'],
          status: 'pass',
          notes: BACK_SUB,
        },
        uncertainty: {
          assumptions: ['none'],
          lowConfidenceSteps: ['none'],
          studentChecks: ['Verify that half-life is 18 days and radiation factor is 64.'],
        },
      },
    };
    const html = renderToStaticMarkup(<SolutionView session={session} theme="light" />);
    expect(html).not.toContain('slm-verify');
    expect(html).not.toContain('slm-uncertainty');
    expect(html).not.toContain('slm-step-id');
    expect(html).not.toMatch(/>Verification</i);
    expect(html).not.toMatch(/>Uncertainty</i);
    expect(html).not.toMatch(/\bstatus:\s*(pass|fail)\b/i);
    expect(html).not.toMatch(/\bmethods:\s/i);
    expect(html).not.toMatch(/student check/i);
    expect(html).not.toMatch(/low-confidence/i);
    expect(html).not.toContain('Verify that ');
    expect(html).not.toMatch(/>none</i);
    expect(html).not.toMatch(/assumption:\s*none/i);
    expect(html).toContain('Back-substitution yields');
    expect(html).toContain('matching the factor 64');
    expect(html).toContain('slm-answer-notes');
    expect(html).not.toMatch(/aria-label="[^"]*\bs1\b/);
    expect(html).not.toMatch(/title="[^"]*\bs1\b/);
  });

  it('folds a real assumption as unlabeled answer prose', () => {
    const session: Session = {
      id: 'sv-assume',
      createdAt: 0,
      updatedAt: 0,
      platform: 'gemini',
      question: 'Find the range',
      raw: '',
      capsule: {
        meta: { version: 2, subject: 'Physics', topic: 'Projectile range' },
        solution: 'Range follows from the formula.',
        solutionDiagrams: [],
        steps: [
          {
            id: 's1',
            index: 1,
            title: 'Write the range formula',
            body: '$R=u^2\\sin 2\\theta/g$.',
          },
        ],
        verification: {
          methods: ['units'],
          status: 'pass',
          notes: 'none',
        },
        uncertainty: {
          assumptions: ['take g as 9.81 metres per second squared'],
          lowConfidenceSteps: ['s1'],
          studentChecks: ['Verify that the launch angle is 45 degrees.'],
        },
      },
    };
    const html = renderToStaticMarkup(<SolutionView session={session} theme="light" />);
    expect(html).toContain('take g as 9.81 metres per second squared');
    expect(html).toContain('slm-answer-notes');
    expect(html).not.toMatch(/>assumptions</i);
    expect(html).not.toMatch(/>Verification</i);
    expect(html).not.toContain('Verify that the launch angle');
    expect(html).not.toContain('slm-step-id');
    expect(html).not.toMatch(/>none</i);
  });
});
