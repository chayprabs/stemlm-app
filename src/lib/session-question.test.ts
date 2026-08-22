import { describe, it, expect } from 'vitest';
import type { Session } from '@/src/protocol/types';
import { sessionQuestionHeading } from './session-question';

function makeSession(overrides: Partial<Session> & { question?: string }): Session {
  return {
    id: 's1',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: overrides.question ?? '',
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Electrical', topic: 'RLC impedance at 60 Hz' },
      solution: '',
      solutionDiagrams: [],
      steps: [
        {
          id: 'step-1',
          index: 1,
          title: 'Calculate the angular frequency',
          body: 'ω = 2πf',
        },
      ],
      ...overrides.capsule,
    },
    ...overrides,
  };
}

const RLC_QUESTION = `A series RLC circuit is connected to a sinusoidal voltage source of 120 V (rms) at 60 Hz. The circuit has R = 10 Ω, L = 50 mH, and C = 100 µF.

(a) Calculate the impedance of the circuit.

(b) Find the rms current flowing through the circuit.

(c) Determine whether the circuit is capacitive, inductive, or resistive in nature — and justify your answer.`;

describe('sessionQuestionHeading', () => {
  it('shows the stored question, not the active step title', () => {
    const session = makeSession({ question: RLC_QUESTION });
    const heading = sessionQuestionHeading(session);
    expect(heading).toContain('series RLC circuit');
    expect(heading).not.toContain('angular frequency');
    expect(heading).not.toContain('Calculate the');
  });

  it('compresses long multi-part questions into a short layman line', () => {
    const session = makeSession({ question: RLC_QUESTION });
    const heading = sessionQuestionHeading(session);
    expect(heading).toMatch(/\(3 parts\)$/);
    expect(heading.length).toBeLessThan(220);
  });

  it('shows a short question in full', () => {
    const session = makeSession({ question: 'What is 2 + 2?' });
    expect(sessionQuestionHeading(session)).toBe('What is 2 + 2?');
  });

  it('strips stemLM instruction blocks from the composer text', () => {
    const session = makeSession({
      question: `Find the derivative of x^2

--- stemLM instructions (do not remove) ---
OUTPUT: stemlm`,
    });
    expect(sessionQuestionHeading(session)).toBe('Find the derivative of x^2');
  });

  it('strips the attached-protocol stub from the composer text', () => {
    const session = makeSession({
      question: `Find the derivative of x^2

Follow the attached stemlm-protocol.txt exactly. Infer the subject from the problem and apply that playbook in the file.
Reply in ONE fenced stemlm block ending @end.`,
    });
    expect(sessionQuestionHeading(session)).toBe('Find the derivative of x^2');
  });

  it('falls back to capsule topic when question is empty', () => {
    const session = makeSession({ question: '' });
    expect(sessionQuestionHeading(session)).toBe('RLC impedance at 60 Hz');
  });

  it('uses @meta question when composer text is empty (image paste)', () => {
    const session = makeSession({
      question: '',
      capsule: {
        meta: {
          version: 1,
          subject: 'Electrical',
          topic: 'Nodal analysis',
          question: 'Find V_A when V_s = 48 V across the network.',
        },
        solution: '',
        solutionDiagrams: [],
        steps: [],
      },
    });
    expect(sessionQuestionHeading(session)).toContain('V_s = 48 V');
  });

  it('dedupes garbled composer math in the stored question', () => {
    const session = makeSession({
      question: 'Source Vs=48V_s = 48 V is applied.',
    });
    expect(sessionQuestionHeading(session)).toContain('V_s = 48');
    expect(sessionQuestionHeading(session)).not.toContain('Vs=48');
  });
});
