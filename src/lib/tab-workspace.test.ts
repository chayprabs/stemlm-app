import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContentTabId,
  handleWhoamiRequest,
  loadTabWorkspace,
  saveTabWorkspace,
  setPendingPanelAction,
  setPanelActionResult,
  takePendingPanelAction,
  takePanelActionResult,
  workspaceFromStore,
} from './tab-workspace';
import type { Session } from '@/src/protocol/types';
import { restorableSessions } from '@/src/content/restored-sessions';

const sessionStore = new Map<string, unknown>();

const getCurrent = vi.hoisted(() => vi.fn(async () => undefined));
const sendMessage = vi.hoisted(() =>
  vi.fn(async (msg: unknown): Promise<unknown> => {
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
  it('PERS-01 claims pending actions once across independent module realms', async () => {
    await setPendingPanelAction({ tabId: 42, type: 'stemlm:open-panel' });
    const original = sendMessage.getMockImplementation()!;
    sendMessage.mockImplementation(async (message: unknown) => {
      if ((message as { type?: string }).type === 'stemlm:claim-panel-action') {
        return { action: await takePendingPanelAction(42) };
      }
      return original(message);
    });
    try {
      vi.resetModules();
      const first = await import('./tab-workspace');
      vi.resetModules();
      const second = await import('./tab-workspace');
      const results = await Promise.all([first.takePendingPanelAction(42, true), second.takePendingPanelAction(42, true)]);
      expect(results.filter(Boolean)).toEqual(['stemlm:open-panel']);
    } finally {
      sendMessage.mockImplementation(original);
    }
  });
  it('PERS-06 reports workspace quota failures', async () => {
    const { browser } = await import('wxt/browser');
    vi.mocked(browser.storage.session.set).mockRejectedValueOnce(new Error('QUOTA_BYTES exceeded'));
    expect(await saveTabWorkspace(workspaceFromStore(71, { sessions: [], activeStepIndex: 0 }))).toBe(false);
  });

  it('PERS-06 releases closed-tab workspace/action/result keys while preserving other tabs', async () => {
    const workspace = await import('./tab-workspace');
    for (const tabId of [71, 72]) {
      await saveTabWorkspace(workspaceFromStore(tabId, { sessions: [], activeStepIndex: 0 }));
      await setPendingPanelAction({ tabId, type: 'stemlm:open-panel' });
      await setPanelActionResult(tabId, { ok: true });
    }
    await workspace.removeTabWorkspace(71);
    expect(await loadTabWorkspace(71)).toBeNull();
    expect(await takePendingPanelAction(71)).toBeNull();
    expect(await takePanelActionResult(71)).toBeNull();
    expect(await loadTabWorkspace(72)).not.toBeNull();
    expect(await takePendingPanelAction(72)).toBe('stemlm:open-panel');
    expect(await takePanelActionResult(72)).toEqual({ ok: true });
  });
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

  it('brings an answer structured from the chat back as one: its origin and steps, without its Markdown', async () => {
    const plain: Session = {
      ...sampleSession('plain'),
      raw: '### Step 1\n\nbody\n\n```stemlm\n@meta\ntopic: Not this answer\n@endmeta\n@end\n```',
      origin: 'ingest',
    };
    await saveTabWorkspace(workspaceFromStore(42, { sessions: [sampleSession('capsule'), plain], activeSessionId: 'plain', activeStepIndex: 0 }));
    // Storage hands back a JSON copy, and the content script admits records before using them.
    const admitted = restorableSessions(JSON.parse(JSON.stringify((await loadTabWorkspace(42))?.sessions)));
    expect(admitted.rejected).toBe(0);
    expect(admitted.sessions).toEqual([{ ...sampleSession('capsule'), raw: '' }, { ...plain, raw: '' }]);
    expect(admitted.sessions[0]).not.toHaveProperty('origin');
  });

  it('keeps independent backups per tab id', async () => {
    await saveTabWorkspace(workspaceFromStore(99, { sessions: [sampleSession('x')], activeStepIndex: 0 }));
    await saveTabWorkspace(workspaceFromStore(42, { sessions: [sampleSession('y')], activeStepIndex: 1 }));

    expect(await loadTabWorkspace(42)).toMatchObject({ activeStepIndex: 1 });
    expect(await loadTabWorkspace(99)).toMatchObject({ activeStepIndex: 0 });
    expect((await loadTabWorkspace(42))?.sessions[0]?.id).toBe('y');
    expect((await loadTabWorkspace(99))?.sessions[0]?.id).toBe('x');
  });

  it('does not lose either tab when independent writes start together', async () => {
    await Promise.all([
      saveTabWorkspace(workspaceFromStore(101, { sessions: [sampleSession('a')], activeStepIndex: 0 })),
      saveTabWorkspace(workspaceFromStore(202, { sessions: [sampleSession('b')], activeStepIndex: 1 })),
    ]);
    expect((await loadTabWorkspace(101))?.sessions[0]?.id).toBe('a');
    expect((await loadTabWorkspace(202))?.sessions[0]?.id).toBe('b');
  });

  it('does not let an older workspace cursor overwrite a newer one', async () => {
    const newer = { ...workspaceFromStore(42, { sessions: [sampleSession('new')], activeStepIndex: 2 }), savedAt: 200 };
    const older = { ...workspaceFromStore(42, { sessions: [sampleSession('old')], activeStepIndex: 1 }), savedAt: 100 };
    await saveTabWorkspace(newer);
    await saveTabWorkspace(older);

    expect(await loadTabWorkspace(42)).toMatchObject({ activeStepIndex: 2, savedAt: 200 });
  });

  it('consumes a pending panel action once', async () => {
    await setPendingPanelAction({ tabId: 42, type: 'stemlm:open-panel' });
    expect(await takePendingPanelAction(42)).toBe('stemlm:open-panel');
    expect(await takePendingPanelAction(42)).toBeNull();
  });

  it('serializes overlapping pending-action consumers', async () => {
    await setPendingPanelAction({ tabId: 42, type: 'stemlm:open-panel' });
    const results = await Promise.all([takePendingPanelAction(42), takePendingPanelAction(42)]);
    expect(results.sort()).toEqual(['stemlm:open-panel', null].sort());
  });

  it('keeps a newer pending action when an older consumer is queued first', async () => {
    await setPendingPanelAction({ tabId: 42, type: 'stemlm:open-panel' });
    const consumed = takePendingPanelAction(42);
    const newer = setPendingPanelAction({ tabId: 42, type: 'stemlm:load-conversation' });

    expect(await consumed).toBe('stemlm:open-panel');
    await newer;
    expect(await takePendingPanelAction(42)).toBe('stemlm:load-conversation');
  });

  it('keeps a newer panel result when an older consumer is queued first', async () => {
    await setPanelActionResult(42, { ok: true, loaded: 1 });
    const consumed = takePanelActionResult(42);
    const newer = setPanelActionResult(42, { ok: true, loaded: 2 });

    expect(await consumed).toEqual({ ok: true, loaded: 1 });
    await newer;
    expect(await takePanelActionResult(42)).toEqual({ ok: true, loaded: 2 });
  });

  it('resolves the content-script tab id from sender.tab, not tabs.getCurrent', async () => {
    expect(handleWhoamiRequest({ tab: { id: 81 } })).toEqual({ tabId: 81 });
    expect(await getContentTabId()).toBe(42);
    expect(getCurrent).not.toHaveBeenCalled();
  });
});
