import { describe, it, expect } from 'vitest';
import {
  ALL_SAVED_SUBJECTS,
  ALL_SAVED_TIME,
  SAVED_SEARCH_PLACEHOLDER,
  SAVED_TIME_FILTERS,
  filterSavedSessions,
  savedSessionQuestion,
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
    savedAt?: number;
  },
): SavedFilterable {
  return {
    id: overrides.id,
    question: overrides.question,
    savedAt: overrides.savedAt,
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
    savedAt: 3,
  }),
  snap({
    id: 'newton',
    question: 'A 2 kg mass accelerates at 3 m/s^2. What is the net force?',
    subject: 'Physics',
    topic: 'Newton second law',
    savedAt: 2,
  }),
  snap({
    id: 'quad',
    question: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Math',
    topic: 'Quadratic formula',
    savedAt: 1,
  }),
];

describe('savedSessionQuestion', () => {
  it('labels a row with the question as written, not the topic', () => {
    const heading = savedSessionQuestion(
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
    expect(savedSessionQuestion(snap({ id: 't', question: '', topic: 'KCL at node A' }))).toBe(
      'KCL at node A',
    );
  });

  it('keeps a long multi-part question intact for 2-line clamping', () => {
    const heading = savedSessionQuestion(
      snap({
        id: 'long',
        question: `A series RLC circuit is connected to a sinusoidal voltage source of 120 V (rms) at 60 Hz. The circuit has R = 10 Ω, L = 50 mH, and C = 100 µF.

(a) Calculate the impedance of the circuit.

(b) Find the rms current flowing through the circuit.

(c) Determine whether the circuit is capacitive, inductive, or resistive.`,
        topic: 'RLC',
      }),
    );
    expect(heading).toContain('Calculate the impedance');
    expect(heading).toContain('(c) Determine whether the circuit is capacitive');
    expect(heading).not.toMatch(/\(3 parts\)$/);
  });
});

describe('savedSessionSubjects', () => {
  it('returns present subjects in known-subject order', () => {
    expect(savedSessionSubjects(library)).toEqual(['Physics', 'Math', 'Electrical']);
  });
});

describe('filterSavedSessions', () => {
  it('returns every item for an empty query and all-subjects, most recent first', () => {
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

  it('ranks a fuzzy/typo query above non-matches', () => {
    const found = filterSavedSessions(library, { query: 'impednace of RLC circut' });
    expect(found[0]?.id).toBe('rlc');
    expect(found.map((s) => s.id)).not.toContain('newton');
  });

  it('returns none when the query matches nothing', () => {
    expect(filterSavedSessions(library, { query: 'organic stereochemistry' })).toEqual([]);
  });

  it('hides items older than the selected time window', () => {
    const now = 1_000_000_000_000;
    const items = [
      snap({ id: 'fresh', question: 'Fresh RLC question', savedAt: now - 2 * 60 * 60 * 1000 }),
      snap({
        id: 'week',
        question: 'Week-old kinematics question',
        subject: 'Physics',
        savedAt: now - 3 * 24 * 60 * 60 * 1000,
      }),
      snap({
        id: 'old',
        question: 'Year-old algebra question',
        savedAt: now - 400 * 24 * 60 * 60 * 1000,
      }),
    ];
    expect(
      filterSavedSessions(items, { time: '24h', now }).map((s) => s.id),
    ).toEqual(['fresh']);
    expect(
      filterSavedSessions(items, { time: '7d', now }).map((s) => s.id).sort(),
    ).toEqual(['fresh', 'week']);
    expect(filterSavedSessions(items, { time: ALL_SAVED_TIME, now }).map((s) => s.id)).toContain(
      'old',
    );
    expect(SAVED_TIME_FILTERS.map((f) => f.label)).toEqual([
      'Last 24 hours',
      'Last 7 days',
      'Last month',
      'Last 6 months',
    ]);
  });

  it('composes subject and time filters with search', () => {
    const now = 5_000;
    const items = [
      snap({
        id: 'keep',
        question: 'Net force on a cart',
        subject: 'Physics',
        savedAt: now - 1000,
      }),
      snap({
        id: 'wrong-subject',
        question: 'Net force on a beam',
        subject: 'Mechanical',
        savedAt: now - 1000,
      }),
      snap({
        id: 'too-old',
        question: 'Net force on a crate',
        subject: 'Physics',
        savedAt: now - 40 * 24 * 60 * 60 * 1000,
      }),
    ];
    expect(
      filterSavedSessions(items, {
        query: 'net force',
        subject: 'Physics',
        time: 'month',
        now,
      }).map((s) => s.id),
    ).toEqual(['keep']);
  });
});

describe('search placeholder', () => {
  it('is question-search copy, not a generic Search', () => {
    expect(SAVED_SEARCH_PLACEHOLDER.toLowerCase()).toMatch(/question/);
    expect(SAVED_SEARCH_PLACEHOLDER).not.toBe('Search');
  });
});
