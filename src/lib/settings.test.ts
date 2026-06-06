import { describe, it, expect, beforeEach, vi } from 'vitest';

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
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

import {
  clampSplitRatio,
  DEFAULT_SETTINGS,
  getSettings,
  setSettings,
  hydrateSettings,
} from './settings';

const KEY = 'stemlm_settings';

describe('clampSplitRatio', () => {
  const wide = 1600;

  it('keeps values within [0.25, 0.75] on wide viewports', () => {
    expect(clampSplitRatio(0.5, wide)).toBe(0.5);
    expect(clampSplitRatio(0.1, wide)).toBe(0.25);
    expect(clampSplitRatio(0.9, wide)).toBe(0.75);
  });

  it('falls back to 0.5 for non-finite input', () => {
    expect(clampSplitRatio(NaN, wide)).toBe(0.5);
    expect(clampSplitRatio(Infinity, wide)).toBe(0.5);
  });

  it('default split is 50/50', () => {
    expect(DEFAULT_SETTINGS.splitRatio).toBe(0.5);
  });

  it('defaults to the balanced prompt variant', () => {
    expect(DEFAULT_SETTINGS.promptVariant).toBe('balanced');
  });
});

describe('hydrateSettings', () => {
  it('migrates legacy autoOpenOnInject to autoOpenOnAnswer', () => {
    const settings = hydrateSettings({ autoOpenOnInject: false });
    expect(settings.autoOpenOnAnswer).toBe(false);
  });

  it('rejects invalid theme and default subject values', () => {
    const settings = hydrateSettings({
      theme: 'purple' as never,
      defaultSubject: 'NotASubject' as never,
      promptVariant: 'tiny' as never,
      splitRatio: 9,
    });
    expect(settings.theme).toBe('auto');
    expect(settings.defaultSubject).toBe('Auto');
    expect(settings.promptVariant).toBe('balanced');
    expect(settings.splitRatio).toBe(0.75);
  });

  it('accepts valid subject overrides', () => {
    const settings = hydrateSettings({ defaultSubject: 'Physics' });
    expect(settings.defaultSubject).toBe('Physics');
  });
});

describe('setSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete storageData[KEY];
  });

  it('clamps splitRatio before persisting', async () => {
    const next = await setSettings({ splitRatio: 0.05 });
    const expected = clampSplitRatio(0.05);
    expect(next.splitRatio).toBe(expected);
    expect((storageData[KEY] as { splitRatio: number }).splitRatio).toBe(expected);
  });

  it('persists prompt variant changes', async () => {
    const next = await setSettings({ promptVariant: 'ultra' });
    expect(next.promptVariant).toBe('ultra');
    expect((storageData[KEY] as { promptVariant: string }).promptVariant).toBe('ultra');
  });

  it('round-trips through getSettings', async () => {
    await setSettings({ shareAcrossTabs: true, defaultSubject: 'Math' });
    const loaded = await getSettings();
    expect(loaded.shareAcrossTabs).toBe(true);
    expect(loaded.defaultSubject).toBe('Math');
  });
});
