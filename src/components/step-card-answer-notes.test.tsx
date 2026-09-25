import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Capsule, Session } from '@/src/protocol/types';
import { StepCard } from './StepCard';
import { capsuleSignals } from './CapsuleSignals';

function session(capsule: Partial<Capsule>): Session {
  return {
    id: 'notes-once', createdAt: 1, updatedAt: 1, platform: 'claude', raw: '',
    question: 'A block slides down a 30 degree incline. Find its acceleration.',
    capsule: {
      meta: { version: 2, subject: 'Physics', topic: 'Incline' },
      steps: [
        { id: 's1', index: 1, title: 'Draw the forces', body: 'Weight, normal force and friction act on the block.' },
        { id: 's2', index: 2, title: 'Resolve along the slope', body: 'The net force is $mg\\sin\\theta$.' },
        { id: 's3', index: 3, title: 'Solve for a', body: 'So $a = g\\sin\\theta = 4.9$ m/s^2.' },
      ],
      solution: 'a = 4.9 m/s^2 down the slope.',
      solutionDiagrams: [],
      verification: { methods: ['units'], status: 'pass', notes: 'At 90 degrees the result reduces to free fall, a = g.' },
      uncertainty: { assumptions: ['g = 9.81 m/s^2, air resistance unknown and neglected'], lowConfidenceSteps: [], studentChecks: [] },
      ...capsule,
    },
  };
}

function card(s: Session, index: number): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<StepCard session={s} index={index} theme="light" />);
  return root;
}

describe('UI-NOTES-01 answer-level notes appear once', () => {
  it('keeps check and assumption lines out of every step except the last', () => {
    const s = session({});
    for (const index of [0, 1]) {
      const root = card(s, index);
      expect(root.querySelector('.slm-answer-notes')).toBeNull();
      expect(root.textContent).not.toContain('reduces to free fall');
      expect(root.textContent).not.toContain('air resistance');
    }
    const last = card(s, 2);
    expect(last.querySelector('.slm-answer-notes')?.textContent).toContain('reduces to free fall');
    expect(last.querySelector('.slm-answer-notes')?.textContent).toContain('air resistance unknown');
  });
});

describe('UI-SIGNALS-01 answer-level flags', () => {
  const nonStem = session({
    meta: { version: 2, subject: 'General', topic: 'Not a STEM question', archetype: 'conceptual' },
    uncertainty: { assumptions: ['insufficient data for a numeric solve'], lowConfidenceSteps: [], studentChecks: [] },
  });

  it('shows the flags on the first step only', () => {
    expect(card(nonStem, 0).querySelector('.slm-signals')?.textContent).toContain('Not a STEM question');
    expect(card(nonStem, 0).textContent).toContain('Insufficient data');
    expect(card(nonStem, 1).querySelector('.slm-signals')).toBeNull();
    expect(card(nonStem, 2).querySelector('.slm-signals')).toBeNull();
  });

  it('does not call a neglected unknown an insufficient-data answer', () => {
    expect(capsuleSignals(session({}).capsule).insufficientData).toBe(false);
    expect(capsuleSignals(session({
      uncertainty: { assumptions: ['mass not given; the answer does not depend on it'], lowConfidenceSteps: [], studentChecks: [] },
    }).capsule).insufficientData).toBe(false);
    expect(capsuleSignals(nonStem.capsule).insufficientData).toBe(true);
  });
});
