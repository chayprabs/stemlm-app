import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { storageData, mockLocalStorage } = vi.hoisted(() => {
  const storageData: Record<string, unknown> = {};
  return {
    storageData,
    mockLocalStorage: {
      get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
    tabs: {
      create: vi.fn(),
      sendMessage: vi.fn(),
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path}`,
      id: 'test',
    },
  },
}));

import { saveSession, getSavedSession, snapshotToSession } from './saved-sessions';
import { buildReportDocument } from './pdf';

function makeSession(): Session {
  return {
    id: 'rep-1',
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: 'What is the impedance of the series RLC circuit?',
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Electrical', topic: 'RLC impedance' },
      steps: [
        {
          id: 'step-1',
          index: 1,
          title: 'Write the impedance',
          body: 'Z = R + j(ωL − 1/ωC)',
        },
      ],
      solution: 'Z = 12.4 Ω inductive',
      solutionDiagrams: [],
    },
  };
}

describe('stored snapshot → report document', () => {
  beforeEach(() => {
    for (const key of Object.keys(storageData)) {
      delete storageData[key];
    }
  });

  it('rebuilds report HTML with the stored question and latest solution', async () => {
    const session = makeSession();
    await saveSession(session);

    const snapshot = await getSavedSession(session.id);
    expect(snapshot?.question).toBe('What is the impedance of the series RLC circuit?');
    expect(snapshot?.solution).toBe('Z = 12.4 Ω inductive');

    const rebuilt = snapshotToSession(snapshot!);
    const html = buildReportDocument(rebuilt, {});

    expect(html).toContain('What is the impedance of the series RLC circuit?');
    expect(html).toContain('Write the impedance');
    expect(html).toContain('slm-report-q-text');
    expect(html).not.toContain('class="slm-report-solution"');
    expect(html).not.toContain('Z = 12.4 Ω inductive');
  });
});
