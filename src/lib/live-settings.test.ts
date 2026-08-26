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

  it('writes theme and prompt variant into the live store', () => {
    applyLiveSettings({ ...DEFAULT_SETTINGS, theme: 'dark', promptVariant: 'ultra' });
    expect(useStore.getState().settings.theme).toBe('dark');
    expect(useStore.getState().settings.promptVariant).toBe('ultra');
    expect(useStore.getState().theme).toBe('dark');
  });

  it('writes behaviour flags the panel and injector read', () => {
    applyLiveSettings({
      ...DEFAULT_SETTINGS,
      shareAcrossTabs: true,
      autoOpenOnAnswer: false,
      stemlmEnabled: false,
      analyticsOptOut: true,
    });
    expect(useStore.getState().settings.shareAcrossTabs).toBe(true);
    expect(useStore.getState().settings.autoOpenOnAnswer).toBe(false);
    expect(useStore.getState().settings.stemlmEnabled).toBe(false);
    expect(useStore.getState().settings.analyticsOptOut).toBe(true);
  });
});
