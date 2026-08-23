import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContentTabId,
  handleWhoamiRequest,
  loadTabWorkspace,
  saveTabWorkspace,
  setPendingPanelAction,
  takePendingPanelAction,
  workspaceFromStore,
} from './tab-workspace';
import type { Session } from '@/src/protocol/types';

const sessionStore = new Map<string, unknown>();

const getCurrent = vi.hoisted(() => vi.fn(async () => undefined));
const sendMessage = vi.hoisted(() =>
  vi.fn(async (msg: unknown) => {
    if ((msg as { type?: string })?.type === 'stemlm:whoami') return { tabId: 42 };
    return undefined;
  }),
);

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(data)) {
            sessionStore.set(key, value);
          }
        }),
        remove: vi.fn(async (key: string) => {
          sessionStore.delete(key);
        }),
      },
    },
    tabs: {
      getCurrent,
    },
    runtime: {
      sendMessage,
    },
  },
}));

function sampleSession(id: string): Session {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'q',
    raw: 'raw',
    capsule: {
      meta: { version: 1, subject: 'Math', topic: 'Topic' },
      steps: [
        {
          id: 'step-1',
          index: 1,
          title: 'Step 1',
          body: 'body',
        },
      ],
      solution: 'done',
      solutionDiagrams: [],
    },
  };
}

describe('tab-workspace', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it('round-trips workspace backup for the same tab', async () => {
    const backup = workspaceFromStore(42, {
      sessions: [sampleSession('s1')],
      activeSessionId: 's1',
      activeStepIndex: 2,
    });
    await saveTabWorkspace(backup);
    const loaded = await loadTabWorkspace(42);
    expect(loaded?.activeStepIndex).toBe(2);
    expect(loaded?.sessions[0]?.id).toBe('s1');
    expect(loaded?.sessions[0]?.raw).toBe('');
  });

  it('keeps independent backups per tab id', async () => {
    await saveTabWorkspace(workspaceFromStore(99, { sessions: [sampleSession('x')], activeStepIndex: 0 }));
    await saveTabWorkspace(workspaceFromStore(42, { sessions: [sampleSession('y')], activeStepIndex: 1 }));

    expect(await loadTabWorkspace(42)).toMatchObject({ activeStepIndex: 1 });
    expect(await loadTabWorkspace(99)).toMatchObject({ activeStepIndex: 0 });
    expect((await loadTabWorkspace(42))?.sessions[0]?.id).toBe('y');
    expect((await loadTabWorkspace(99))?.sessions[0]?.id).toBe('x');
  });

  it('consumes a pending panel action once', async () => {
    await setPendingPanelAction({ tabId: 42, type: 'stemlm:open-panel' });
    expect(await takePendingPanelAction(42)).toBe('stemlm:open-panel');
    expect(await takePendingPanelAction(42)).toBeNull();
  });

  it('resolves the content-script tab id from sender.tab, not tabs.getCurrent', async () => {
    expect(handleWhoamiRequest({ tab: { id: 81 } })).toEqual({ tabId: 81 });
    expect(await getContentTabId()).toBe(42);
    expect(getCurrent).not.toHaveBeenCalled();
  });
});
