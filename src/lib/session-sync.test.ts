import { describe, it, expect } from 'vitest';
import { sessionsForMirror } from './session-sync';
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
