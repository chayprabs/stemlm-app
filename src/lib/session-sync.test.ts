import { describe, it, expect } from 'vitest';
import { mergeMirroredSessions, sessionsForMirror } from './session-sync';
import type { Session } from '@/src/protocol/types';

function makeSession(id: string): Session {
  return {
    id,
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: 'Q',
    raw: 'long raw capsule text',
    reviewedStepIds: [],
    capsule: {
      meta: { version: 1, subject: 'Math', topic: 'T' },
      steps: [],
      solution: 'A',
      solutionDiagrams: [],
    },
  };
}

describe('sessionsForMirror', () => {
  it('strips raw capsule text from mirrored payloads', () => {
    const mirrored = sessionsForMirror([makeSession('a')]);
    expect(mirrored[0]?.raw).toBe('');
    expect(mirrored[0]?.question).toBe('Q');
  });
});

describe('mergeMirroredSessions', () => {
  it('keeps the newer copy when the same id appears in both lists', () => {
    const older = { ...makeSession('a'), updatedAt: 10, question: 'old' };
    const newer = { ...makeSession('a'), updatedAt: 99, question: 'new' };
    const merged = mergeMirroredSessions([older], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.question).toBe('new');
  });

  it('unionizes sessions from both tabs', () => {
    const merged = mergeMirroredSessions([makeSession('a')], [makeSession('b')]);
    expect(merged.map((s) => s.id).sort()).toEqual(['a', 'b']);
  });
});
