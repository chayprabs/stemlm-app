import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Capsule, Session } from '@/src/protocol/types';
import { StepCard } from './StepCard';
import { CHECK_FAILED_NOTE, capsuleSignals } from './CapsuleSignals';
import { ORIGIN_NOTE_DETAIL, REPORT_NOTE } from './OriginNote';

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

describe('what was and was not checked', () => {
  const labels = (root: HTMLElement) => [...root.querySelectorAll('.slm-answer-note-label')].map((el) => el.textContent);

  it('names the check and the assumptions as the model\'s own, never as stemlm\'s', () => {
    const last = card(session({}), 2);
    expect(labels(last)).toEqual(['The model\'s own check', 'The model assumed']);
    const [check, assumed] = [...last.querySelectorAll('.slm-answer-note')];
    expect(check!.textContent).toContain('reduces to free fall');
    expect(check!.textContent).not.toContain('air resistance');
    expect(assumed!.textContent).toContain('air resistance unknown');
    // A check that passed is not announced: only its words are shown.
    expect(last.querySelector('.slm-answer-note-failed')).toBeNull();
    expect(last.textContent).not.toMatch(/\bpass(ed)?\b/i);
  });

  it('says in words that the model reported a failed check, even one that came with no note', () => {
    const failed = card(session({
      verification: { methods: ['units'], status: 'fail', notes: 'none' },
      uncertainty: { assumptions: [], lowConfidenceSteps: [], studentChecks: [] },
    }), 2);
    expect(labels(failed)).toEqual(['The model\'s own check']);
    expect(failed.querySelector('.slm-answer-note-failed')?.textContent).toBe(CHECK_FAILED_NOTE);
    expect(failed.querySelector('.slm-answer-note')?.hasAttribute('data-failed')).toBe(true);
    // With its correction, when it gave one.
    const corrected = card(session({ verification: { methods: ['units'], status: 'fail', notes: 'mA vs A', correction: 'I is 2 A, not 2 mA' } }), 2);
    expect(corrected.querySelector('.slm-answer-note')?.textContent).toContain('I is 2 A, not 2 mA');
    // Never on an earlier step, and never as protocol chrome.
    expect(card(session({ verification: { methods: ['units'], status: 'fail', notes: 'none' } }), 0).textContent).not.toContain(CHECK_FAILED_NOTE);
    expect(failed.innerHTML).not.toMatch(/status:\s*fail/i);
  });

  it('shows nothing when the model said nothing about its answer', () => {
    const quiet = card(session({ verification: { methods: ['units'], status: 'pass', notes: 'none' }, uncertainty: undefined }), 2);
    expect(quiet.querySelector('.slm-answer-notes')).toBeNull();
  });

  it('closes every answer, on its last step only, with one line on what stemlm did and did not check', () => {
    const s = session({});
    for (const index of [0, 1]) expect(card(s, index).querySelector('.slm-origin-note')).toBeNull();
    const notes = card(s, 2).querySelectorAll('.slm-origin-note');
    expect(notes).toHaveLength(1);
    expect(notes[0]!.textContent).toBe(REPORT_NOTE);
    expect(REPORT_NOTE).toMatch(/does not verify/);
    // After the answer and the model's notes, before the Ask-in-chat bar.
    const last = card(s, 2);
    const order = ['.slm-answer', '.slm-answer-notes', '.slm-origin-note', '.slm-followup'].map((sel) => last.querySelector(sel)!);
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // An answer stemlm arranged from a plain reply says what it did there, in the same place.
    const plain = card({ ...s, origin: 'ingest' }, 2).querySelectorAll('.slm-origin-note');
    expect([...plain].map((el) => el.textContent)).toEqual([ORIGIN_NOTE_DETAIL]);
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
