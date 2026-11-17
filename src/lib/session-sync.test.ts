import { describe, it, expect, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

const shared = vi.hoisted(() => new Map<string, unknown>());

// Chrome hands every reader its own JSON copy of what was stored; the double does the same.
vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      session: {
        get: async (key: string) => (shared.has(key) ? { [key]: JSON.parse(JSON.stringify(shared.get(key))) } : {}),
        set: async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) shared.set(key, JSON.parse(JSON.stringify(value)));
        },
      },
      onChanged: { addListener: () => {}, removeListener: () => {} },
    },
  },
}));

import { restorableSessions } from '@/src/content/restored-sessions';
import { loadMirroredSessions, mergeMirroredSessions, mirrorActiveSessions, sessionsForMirror } from './session-sync';

function makeSession(id: string): Session {
  return {
    id,
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: 'Q',
    raw: 'long raw capsule text',
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

  it('keeps append order (oldest first) so sessions[length-1] is the newest', () => {
    const oldSession = { ...makeSession('a'), createdAt: 5 };
    const newSession = { ...makeSession('b'), createdAt: 50 };
    expect(mergeMirroredSessions([newSession], [oldSession]).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('preserves local raw text when a newer mirrored copy strips it', () => {
    const local = { ...makeSession('a'), updatedAt: 10, raw: 'full capsule raw' };
    const incoming = { ...makeSession('a'), updatedAt: 99, raw: '' };
    const merged = mergeMirroredSessions([local], [incoming]);
    expect(merged[0]?.raw).toBe('full capsule raw');
    expect(merged[0]?.updatedAt).toBe(99);
  });
});

/** The answer's Markdown. Its `stemlm` fence is a figure; read as a capsule it would be a different answer. */
const MARKDOWN = '### Step 1\n\nDraw the graph.\n\n```stemlm\n@meta\ntopic: Not this answer\n@endmeta\n@end\n```\n\n### Step 2\n\nRead the path.';

function ingestSession(id: string): Session {
  return {
    ...makeSession(id),
    raw: MARKDOWN,
    origin: 'ingest',
    capsule: {
      meta: { version: 1, subject: 'CS', topic: 'Shortest path' },
      steps: [
        { id: 's1', index: 1, title: 'Draw the graph', body: 'Draw the graph.' },
        { id: 's2', index: 2, title: 'Read the path', body: 'Read the path.' },
      ],
      solution: '',
      solutionDiagrams: [],
    },
  };
}

describe('an answer structured from the chat, shared across tabs', () => {
  it('is mirrored without its Markdown and still says where it came from', () => {
    const [mirrored] = sessionsForMirror([ingestSession('a')]);
    expect(mirrored).toEqual({ ...ingestSession('a'), raw: '' });
  });

  it('arrives in another tab as the same answer: its origin, its steps, nothing to parse', async () => {
    await mirrorActiveSessions([ingestSession('plain-1')]);
    const admitted = restorableSessions(await loadMirroredSessions());
    expect(admitted.rejected).toBe(0);
    const [arrived] = mergeMirroredSessions([], admitted.sessions);
    expect(arrived).toEqual({ ...ingestSession('plain-1'), raw: '' });
  });

  it('gets its Markdown back in the tab that structured it, whichever copy is newer', () => {
    const local = ingestSession('a');
    const [mirrored] = sessionsForMirror([{ ...local, updatedAt: 99 }]);
    expect(mergeMirroredSessions([local], [mirrored!])[0]).toEqual({ ...local, updatedAt: 99 });
    expect(mergeMirroredSessions([{ ...local, raw: '' }], [local])[0]).toEqual(local);
  });

  it('does not lend its Markdown to the stemLM answer that replaced it under the same id', () => {
    const local = ingestSession('a');
    const { origin: _origin, ...retried } = { ...local, updatedAt: 99, raw: '' };
    const merged = mergeMirroredSessions([local], [retried])[0]!;
    expect(merged.raw).toBe('');
    expect(merged.origin).toBeUndefined();
  });

  it('does not borrow capsule text from a stemLM answer under the same id', () => {
    const capsule = { ...makeSession('a'), raw: '@meta\ntopic: T\n@endmeta\n@end' };
    const restored = { ...ingestSession('a'), raw: '' };
    // Newer: the structured answer wins as it is.
    expect(mergeMirroredSessions([capsule], [{ ...restored, updatedAt: 99 }])[0]).toEqual({ ...restored, updatedAt: 99 });
    // Same age: the local copy stays, and stays without text.
    expect(mergeMirroredSessions([restored], [capsule])[0]).toEqual(restored);
  });
});

describe('SHARE-01 removals propagate across tabs', () => {
  it('drops a session another tab removed and never merges it back', () => {
    const removed = new Set(['a']);
    const merged = mergeMirroredSessions([makeSession('a'), makeSession('b')], [makeSession('b')], removed);
    expect(merged.map((s) => s.id)).toEqual(['b']);
    expect(mergeMirroredSessions([makeSession('b')], [makeSession('a')], removed).map((s) => s.id)).toEqual(['b']);
  });

  it('orders ties the same way in every tab so tabs agree', () => {
    const x = makeSession('x');
    const y = makeSession('y');
    expect(mergeMirroredSessions([y], [x]).map((s) => s.id)).toEqual(['x', 'y']);
    expect(mergeMirroredSessions([x], [y]).map((s) => s.id)).toEqual(['x', 'y']);
  });
});
