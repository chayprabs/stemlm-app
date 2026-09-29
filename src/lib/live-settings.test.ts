import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import { useStore } from '@/src/state/store';

const sessionStore = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(data)) sessionStore.set(k, v);
        }),
      },
    },
  },
}));

import { applyLiveSettings } from './live-settings';

describe('applyLiveSettings', () => {
  beforeEach(() => {
    sessionStore.clear();
    useStore.setState({
      settings: DEFAULT_SETTINGS,
      theme: 'light',
      splitRatio: DEFAULT_SETTINGS.splitRatio,
      splitDragging: false,
      sessions: [],
    });
  });

  it('writes theme into the live store', () => {
    applyLiveSettings({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(useStore.getState().settings.theme).toBe('dark');
    expect(useStore.getState().theme).toBe('dark');
  });

  it('writes behaviour flags the panel and injector read', () => {
    applyLiveSettings({
      ...DEFAULT_SETTINGS,
      shareAcrossTabs: true,
      autoOpenOnAnswer: false,
      stemlmEnabled: false,
    });
    expect(useStore.getState().settings.shareAcrossTabs).toBe(true);
    expect(useStore.getState().settings.autoOpenOnAnswer).toBe(false);
    expect(useStore.getState().settings.stemlmEnabled).toBe(false);
  });

  it('SHARE-02 turning sharing on keeps the answer and step this tab is reading', async () => {
    const make = (id: string, createdAt: number) => ({
      id, createdAt, updatedAt: createdAt, platform: 'gemini', question: 'Q', raw: '',
      capsule: { meta: { version: 1, subject: 'Math', topic: id }, steps: [], solution: '', solutionDiagrams: [] },
    }) as never;
    sessionStore.set('stemlm_active_sessions', [make('other-tab', 3)]);
    useStore.setState({ sessions: [make('a', 1), make('b', 2)], activeSessionId: 'a', activeStepIndex: 2, view: 'solution' });
    applyLiveSettings({ ...DEFAULT_SETTINGS, shareAcrossTabs: true });
    await new Promise((r) => setTimeout(r, 0));
    const state = useStore.getState();
    expect(state.sessions.map((s) => s.id)).toEqual(['a', 'b', 'other-tab']);
    expect([state.activeSessionId, state.activeStepIndex, state.view]).toEqual(['a', 2, 'solution']);

    applyLiveSettings(DEFAULT_SETTINGS);
    await new Promise((r) => setTimeout(r, 0));
    expect(sessionStore.get('stemlm_active_sessions')).toEqual([]);
    expect(useStore.getState().sessions).toHaveLength(3);
  });
});
