import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';
import { parseCapsule } from '@/src/protocol/parser';
import * as fixtures from '@/src/protocol/__fixtures__';
import * as longFixtures from '@/src/protocol/__fixtures-long-steps';
import * as visualFixtures from '@/src/protocol/__fixtures-visual-subjects';
import { sessionsForMirror } from '@/src/lib/session-sync';
import { sessionToSnapshot, snapshotToSession } from '@/src/lib/saved-session-storage';
import { structureAnswer } from '@/src/ingest';
import { assertRestorableSessions, restorableSessions } from './restored-sessions';

vi.mock('wxt/browser', () => ({ browser: {} }));

function session(): Session {
  return {
    id: 'answer', createdAt: 1, updatedAt: 2, platform: 'chatgpt', question: 'Why?', raw: 'source',
    capsule: {
      meta: { version: 1, subject: 'General', topic: 'Topic', question: 'Why?', qid: 'q1',
        archetype: 'conceptual', level: 'intro', locale: 'en', mode: 'full' },
      steps: [{ id: 's1', index: 0, title: 'Reason', body: 'Explanation', formula: 'x',
        formulaId: 'e1', takeaway: 'Result', followup: 'Explain more',
        diagram: { type: 'future-family', content: 'uncompiled source', caption: 'Caption', id: 'f1' },
        quickCheck: { question: 'Check?', answer: 'Yes' } }],
      solution: 'Answer', solutionDiagrams: [{ type: 'svg', content: '<svg />' }],
      uncertainty: { assumptions: ['Assumption'], lowConfidenceSteps: ['s1'], studentChecks: ['Check'] },
      verification: { methods: ['units'], status: 'pass', notes: 'Checked', correction: 'Correction' },
    },
    followups: [{ id: 'f1', anchorStepId: 's1', question: 'More?', createdAt: 3,
      capsule: { meta: { version: 1, subject: 'Math', topic: 'Follow-up' }, steps: [],
        solution: 'More detail', solutionDiagrams: [] } }],
  };
}

function replacePath(value: unknown, path: string, replacement: unknown): void {
  const keys = path.split('.');
  let target = value as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys[keys.length - 1]!] = replacement;
}

describe('restored session admission', () => {
  it.each([null, undefined, {}, 'sessions', 1, [null], new Array(1)])(
    'rejects malformed batches (%j)', (value) => {
      expect(() => assertRestorableSessions(value)).toThrow('Cannot restore malformed sessions.');
    },
  );

  it.each<[string, unknown]>([
    ['id', 1], ['question', {}], ['raw', null], ['createdAt', NaN], ['updatedAt', Infinity],
    ['origin', 'verified'], ['origin', null], ['origin', 1],
    ['platform', 'unknown'], ['capsule', undefined], ['capsule.meta', null],
    ['capsule.meta.version', Infinity], ['capsule.meta.subject', {}], ['capsule.meta.topic', []],
    ['capsule.meta.question', false], ['capsule.meta.qid', 1], ['capsule.meta.archetype', 'unknown'],
    ['capsule.meta.level', 'unknown'], ['capsule.meta.locale', []], ['capsule.meta.mode', 'unknown'],
    ['capsule.steps', {}], ['capsule.steps.0', null], ['capsule.steps.0.id', {}],
    ['capsule.steps.0.index', NaN], ['capsule.steps.0.title', []], ['capsule.steps.0.body', 1],
    ['capsule.steps.0.formula', {}], ['capsule.steps.0.formulaId', 1],
    ['capsule.steps.0.takeaway', []], ['capsule.steps.0.followup', {}],
    ['capsule.steps.0.quickCheck', null], ['capsule.steps.0.quickCheck.question', []],
    ['capsule.steps.0.quickCheck.answer', 1], ['capsule.steps.0.diagram', null],
    ['capsule.steps.0.diagram.type', {}], ['capsule.steps.0.diagram.content', []],
    ['capsule.steps.0.diagram.caption', 1], ['capsule.steps.0.diagram.id', {}],
    ['capsule.solution', {}], ['capsule.solutionDiagrams', {}], ['capsule.solutionDiagrams.0', null],
    ['capsule.uncertainty', null], ['capsule.uncertainty.assumptions', 'text'],
    ['capsule.uncertainty.lowConfidenceSteps', [null]], ['capsule.uncertainty.studentChecks', [1]],
    ['capsule.verification', null], ['capsule.verification.methods', ['unknown']],
    ['capsule.verification.status', 'unknown'], ['capsule.verification.notes', []],
    ['capsule.verification.correction', {}], ['followups', {}], ['followups.0', null],
    ['followups.0.id', []], ['followups.0.anchorStepId', {}], ['followups.0.question', 1],
    ['followups.0.createdAt', Infinity], ['followups.0.capsule', null],
    ['followups.0.capsule.steps', {}], ['followups.0.capsule.solutionDiagrams', [null]],
  ])('rejects %s without filtering or modifying the batch', (path, replacement) => {
    const first = session();
    const broken = session();
    replacePath(broken, path, replacement);
    const batch = [first, broken];
    const before = structuredClone(batch);

    expect(() => assertRestorableSessions(batch)).toThrow('Cannot restore malformed sessions.');
    expect(batch).toEqual(before);
    expect(batch[0]).toBe(first);
    expect(batch[1]).toBe(broken);
  });

  it('preserves valid nested records and unknown fields but rejects an appended malformed record', () => {
    let parsedCount = 0;
    let partialCount = 0;
    const solutionOnly = '@meta\nversion: 1\nsubject: Math\ntopic: Result\n@endmeta\n@solution\nA partial answer.\n@endsolution\n@end';
    for (const raw of [...Object.values({ ...fixtures, ...longFixtures, ...visualFixtures }), solutionOnly]) {
      if (typeof raw !== 'string') continue;
      const parsed = parseCapsule(raw);
      if (!parsed.capsule) continue;
      parsedCount++;
      if (parsed.status === 'partial') partialCount++;
      const parsedSession = { ...session(), capsule: parsed.capsule, raw };
      expect(() => assertRestorableSessions([parsedSession])).not.toThrow();
      expect(() => assertRestorableSessions(sessionsForMirror([parsedSession]))).not.toThrow();
      expect(() => assertRestorableSessions([snapshotToSession(sessionToSnapshot(parsedSession))])).not.toThrow();
    }
    expect(parsedCount).toBeGreaterThan(0);
    expect(partialCount).toBeGreaterThan(0);
    const original = session();
    Object.assign(original, { futureField: { nested: ['keep'] } });
    const value: unknown = [original];
    const before = structuredClone(value);
    assertRestorableSessions(value);
    expect(value[0]).toBe(original);
    expect(value[0]!.capsule).toBe(original.capsule);
    expect(value[0]!.followups).toBe(original.followups);
    expect(value).toEqual(before);
    expect(() => assertRestorableSessions([...value, {}])).toThrow('Cannot restore malformed sessions.');
  });

  it('admits an answer structured from the chat as it is, on every route a session is stored by', () => {
    const markdown = [
      '### Step 1: Set up the equation',
      'Newton\'s second law along the incline gives the net force on the block.',
      '$$ma = mg\\sin\\theta - \\mu mg\\cos\\theta$$',
      '### Step 2: Solve for the acceleration',
      'Divide by the mass and substitute the numbers to get the acceleration down the slope.',
      '```stemlm\n@meta\ntopic: Not this answer\n@endmeta\n@end\n```',
      '**Final answer:** the block accelerates at about $3.2\\ \\text{m/s}^2$.',
    ].join('\n\n');
    const structured = structureAnswer(markdown, { question: 'Find the acceleration.' });
    expect(structured?.capsule.steps.length).toBeGreaterThan(1);
    const plain: Session = {
      id: 'plain', createdAt: 1, updatedAt: 2, platform: 'claude', question: 'Find the acceleration.',
      capsule: structured!.capsule, raw: markdown, origin: 'ingest',
    };
    const batch: unknown = [plain, { ...session(), origin: 'capsule' }];
    const before = structuredClone(batch);
    assertRestorableSessions(batch);
    // Admission checks; it never rewrites: the same record, the same Markdown, still unparsed.
    expect(batch[0]).toBe(plain);
    expect(batch).toEqual(before);

    const stored = [sessionsForMirror([plain])[0]!, snapshotToSession(sessionToSnapshot(plain))];
    for (const copy of stored) {
      expect(restorableSessions([copy])).toEqual({ sessions: [copy], rejected: 0 });
      expect(copy.origin).toBe('ingest');
      expect(copy.raw).toBe('');
      expect(copy.capsule.steps).toEqual(plain.capsule.steps);
      expect(copy.capsule.verification).toBeUndefined();
    }
  });

  it('accepts empty batches and zero-step capsules, while rejecting malformed zero-step records', () => {
    const empty: unknown = [];
    assertRestorableSessions(empty);
    expect(empty).toEqual([]);
    const original = session();
    original.capsule = { meta: { version: 1, subject: 'General', topic: '' },
      steps: [], solution: '', solutionDiagrams: [] };
    delete original.followups;
    for (const platform of ['chatgpt', 'claude', 'gemini', 'grok'] as const) {
      original.platform = platform;
      expect(() => assertRestorableSessions([original])).not.toThrow();
    }
    original.capsule.solution = null as unknown as string;
    expect(() => assertRestorableSessions([original])).toThrow('Cannot restore malformed sessions.');
  });
});
