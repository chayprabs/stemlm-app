import { describe, it, expect } from 'vitest';
import {
  ALL_SAVED_SUBJECTS,
  filterSavedSessions,
  savedSessionHeading,
  savedSessionSubject,
  savedSessionSubjects,
  type SavedFilterable,
} from './saved-library';

function snap(
  overrides: {
    id: string;
    question: string;
    subject?: string;
    topic?: string;
    metaQuestion?: string;
  },
): SavedFilterable {
  return {
    id: overrides.id,
    question: overrides.question,
    meta: {
      subject: overrides.subject ?? 'Math',
      topic: overrides.topic ?? 'Algebra',
      question: overrides.metaQuestion,
    },
  };
}

const library = [
  snap({
    id: 'rlc',
    question: 'Find the impedance of the series RLC circuit at 60 Hz.',
    subject: 'Electrical',
    topic: 'RLC impedance',
  }),
  snap({
    id: 'newton',
    question: 'A 2 kg mass accelerates at 3 m/s^2. What is the net force?',
    subject: 'Physics',
    topic: 'Newton second law',
  }),
  snap({
    id: 'quad',
    question: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Math',
    topic: 'Quadratic formula',
  }),
];

describe('savedSessionHeading', () => {
  it('labels a row with the question, not the topic', () => {
    const heading = savedSessionHeading(
      snap({
        id: 'n',
        question: 'Find V_A when V_s = 48 V across the network.',
        subject: 'Electrical',
        topic: 'Nodal analysis',
      }),
    );
    expect(heading).toContain('Find V_A');
    expect(heading).not.toBe('Nodal analysis');
  });

  it('falls back to topic when the question is empty', () => {
    expect(
      savedSessionHeading(snap({ id: 't', question: '', topic: 'KCL at node A' })),
    ).toBe('KCL at node A');
  });

  it('compresses a long multi-part question', () => {
    const heading = savedSessionHeading(
      snap({
        id: 'long',
        question: `A series RLC circuit is connected to a sinusoidal voltage source of 120 V (rms) at 60 Hz. The circuit has R = 10 Ω, L = 50 mH, and C = 100 µF.

(a) Calculate the impedance of the circuit.

(b) Find the rms current flowing through the circuit.

(c) Determine whether the circuit is capacitive, inductive, or resistive.`,
        topic: 'RLC',
      }),
    );
    expect(heading).toMatch(/\(3 parts\)$/);
    expect(heading.length).toBeLessThan(220);
  });
});

describe('savedSessionSubjects', () => {
  it('returns present subjects in known-subject order', () => {
    expect(savedSessionSubjects(library)).toEqual(['Physics', 'Math', 'Electrical']);
  });
});

describe('filterSavedSessions', () => {
  it('returns every item for an empty query and all-subjects', () => {
    expect(filterSavedSessions(library, { query: '', subject: ALL_SAVED_SUBJECTS })).toHaveLength(3);
    expect(filterSavedSessions(library, { query: '', subject: '' }).map((s) => s.id)).toEqual([
      'rlc',
      'newton',
      'quad',
    ]);
  });

  it('keeps only the selected subject', () => {
    const physics = filterSavedSessions(library, { subject: 'Physics' });
    expect(physics.map((s) => s.id)).toEqual(['newton']);
    expect(physics.every((s) => savedSessionSubject(s) === 'Physics')).toBe(true);
  });

  it('returns only the item whose question matches the query', () => {
    const found = filterSavedSessions(library, { query: 'impedance of the series RLC' });
    expect(found.map((s) => s.id)).toEqual(['rlc']);
  });

  it('finds an item by topic even when the question does not contain the query', () => {
    const found = filterSavedSessions(library, { query: 'Quadratic formula' });
    expect(found.map((s) => s.id)).toEqual(['quad']);
    expect(found[0]?.question.toLowerCase()).not.toContain('quadratic formula');
  });

  it('returns none when the query matches nothing', () => {
    expect(filterSavedSessions(library, { query: 'organic stereochemistry' })).toEqual([]);
  });
});
