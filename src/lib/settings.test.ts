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
  DEFAULT_SPLIT_RATIO,
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

  it('falls back to the default split for non-finite input', () => {
    expect(clampSplitRatio(NaN, wide)).toBe(DEFAULT_SPLIT_RATIO);
    expect(clampSplitRatio(Infinity, wide)).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('default split is a modest majority, not 50/50', () => {
    expect(DEFAULT_SETTINGS.splitRatio).toBe(DEFAULT_SPLIT_RATIO);
    expect(DEFAULT_SPLIT_RATIO).toBeGreaterThan(0.5);
    expect(DEFAULT_SPLIT_RATIO).toBeLessThanOrEqual(0.58);
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

  it('rejects invalid theme and prompt variant values', () => {
    const settings = hydrateSettings({
      theme: 'purple' as never,
      promptVariant: 'tiny' as never,
      splitRatio: 9,
    });
    expect(settings.theme).toBe('auto');
    expect(settings.promptVariant).toBe('balanced');
    expect(settings.splitRatio).toBe(0.75);
  });

  it('drops legacy defaultSubject from stored settings', () => {
    const settings = hydrateSettings({ defaultSubject: 'Physics' });
    expect(settings).not.toHaveProperty('defaultSubject');
    expect(settings.theme).toBe('auto');
  });

  it('migrates stored exact 0.5 (legacy default) to the new majority split', () => {
    expect(hydrateSettings({ splitRatio: 0.5 }).splitRatio).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSettings({}).splitRatio).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('preserves a user-resized split that is not the legacy 0.5 default', () => {
    expect(hydrateSettings({ splitRatio: 0.62 }).splitRatio).toBe(0.62);
    expect(hydrateSettings({ splitRatio: 0.37 }).splitRatio).toBe(0.37);
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
    await setSettings({ shareAcrossTabs: true, promptVariant: 'ultra' });
    const loaded = await getSettings();
    expect(loaded.shareAcrossTabs).toBe(true);
    expect(loaded.promptVariant).toBe('ultra');
    expect(loaded).not.toHaveProperty('defaultSubject');
  });
});
