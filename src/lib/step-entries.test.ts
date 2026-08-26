import { describe, expect, it } from 'vitest';
import {
  buildStepEntries,
  findFollowupEntryIndex,
  SOLUTION_ANCHOR_ID,
  solutionFollowups,
} from './step-entries';
import type { Capsule, Session, Step, StepFollowup } from '@/src/protocol/types';

function makeStep(id: string, index: number): Step {
  return { id, index, title: `Step ${index}`, body: 'work' };
}

function makeCapsule(stepIds: string[]): Capsule {
  return {
    meta: { version: 1, subject: 'Physics', topic: 'Test' },
    steps: stepIds.map((id, i) => makeStep(id, i + 1)),
    solution: 'done',
    solutionDiagrams: [],
  };
}

function makeSession(stepIds: string[], followups?: StepFollowup[]): Session {
  return {
    id: 'sess1',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'q',
    capsule: makeCapsule(stepIds),
    followups,
    raw: '',
  };
}

function makeFollowup(id: string, anchorStepId: string): StepFollowup {
  return { id, anchorStepId, capsule: makeCapsule(['a1']), createdAt: 0 };
}

describe('buildStepEntries', () => {
  it('interleaves follow-up answers right after their anchor step (1,2,3,●,4)', () => {
    const session = makeSession(['s1', 's2', 's3', 's4'], [makeFollowup('f1', 's3')]);
    const entries = buildStepEntries(session);
    expect(entries.map((e) => e.kind)).toEqual(['step', 'step', 'step', 'followup', 'step']);
    expect(findFollowupEntryIndex(entries, 'f1')).toBe(3);
  });

  it('chains repeat asks on the same step in order, after each other', () => {
    const session = makeSession(
      ['s1', 's2'],
      [makeFollowup('f1', 's2'), makeFollowup('f2', 's2')],
    );
    const entries = buildStepEntries(session);
    expect(entries.map((e) => (e.kind === 'followup' ? e.followup.id : e.step.id))).toEqual([
      's1',
      's2',
      'f1',
      'f2',
    ]);
    const last = entries[3]!;
    expect(last.kind).toBe('followup');
    expect(last.kind === 'followup' ? last.ordinal : 0).toBe(2);
  });

  it('re-anchors orphaned follow-ups to the last step instead of dropping them', () => {
    const session = makeSession(['s1', 's2'], [makeFollowup('f1', 'gone')]);
    const entries = buildStepEntries(session);
    expect(entries).toHaveLength(3);
    const last = entries[2]!;
    expect(last.kind).toBe('followup');
    expect(last.kind === 'followup' ? last.anchorStepIndex : -1).toBe(1);
  });

  it('returns an empty list without a session', () => {
    expect(buildStepEntries(undefined)).toEqual([]);
  });

  it('keeps step and solution follow-ups fully separate (no cross-view leakage)', () => {
    const session = makeSession(
      ['s1', 's2'],
      [makeFollowup('f-step', 's1'), makeFollowup('f-sol', SOLUTION_ANCHOR_ID)],
    );
    const entries = buildStepEntries(session);
    // Rail: only the step-anchored follow-up, never the solution one.
    expect(entries.map((e) => e.key)).toEqual(['step:s1', 'followup:f-step', 'step:s2']);
    // Solution view: only the solution-anchored follow-up.
    expect(solutionFollowups(session).map((f) => f.id)).toEqual(['f-sol']);
  });
});
