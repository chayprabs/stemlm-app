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
  ENABLED_BOOT_KEY,
  ENABLED_FLAG_KEY,
  getSettings,
  hydrateSettings,
  persistStemlmEnabledBoot,
  setSettings,
  stemlmEnabledFromBootCache,
  writeStemlmEnabled,
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

  it('defaults answers to open on the steps tab', () => {
    expect(DEFAULT_SETTINGS.defaultView).toBe('steps');
  });

  it('defaults stemlm to on so the attach control stays visible', () => {
    expect(DEFAULT_SETTINGS.stemlmEnabled).toBe(true);
  });
});

describe('hydrateSettings', () => {
  it('migrates legacy autoOpenOnInject to autoOpenOnAnswer', () => {
    const settings = hydrateSettings({ autoOpenOnInject: false });
    expect(settings.autoOpenOnAnswer).toBe(false);
  });

  it('rejects invalid theme values and clamps split ratio', () => {
    const settings = hydrateSettings({
      theme: 'purple' as never,
      splitRatio: 9,
    });
    expect(settings.theme).toBe('auto');
    expect(settings.splitRatio).toBe(0.75);
  });

  it('normalizes defaultView and keeps a stored solution choice', () => {
    expect(hydrateSettings({ defaultView: 'wat' as never }).defaultView).toBe('steps');
    expect(hydrateSettings({ defaultView: 'solution' }).defaultView).toBe('solution');
  });

  it('drops legacy keys from stored settings', () => {
    const settings = hydrateSettings({
      defaultSubject: 'Physics',
      promptVariant: 'ultra',
      analyticsOptOut: true,
    });
    expect(settings).not.toHaveProperty('defaultSubject');
    expect(settings).not.toHaveProperty('promptVariant');
    expect(settings).not.toHaveProperty('analyticsOptOut');
    expect(settings.theme).toBe('auto');
  });

  it('migrates stored exact 0.5 (legacy default) to the new majority split', () => {
    expect(hydrateSettings({ splitRatio: 0.5 }).splitRatio).toBe(DEFAULT_SPLIT_RATIO);
    expect(hydrateSettings({}).splitRatio).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('migrates stored exact 0.75 (popup-window clamp) back to 55/45', () => {
    expect(hydrateSettings({ splitRatio: 0.75 }).splitRatio).toBe(DEFAULT_SPLIT_RATIO);
  });

  it('preserves a user-resized split that is not the legacy 0.5 default', () => {
    expect(hydrateSettings({ splitRatio: 0.62 }).splitRatio).toBe(0.62);
    expect(hydrateSettings({ splitRatio: 0.37 }).splitRatio).toBe(0.37);
  });

  it('keeps stemlm on for stored settings that predate the toggle', () => {
    expect(hydrateSettings({}).stemlmEnabled).toBe(true);
    expect(hydrateSettings({ theme: 'dark' }).stemlmEnabled).toBe(true);
  });

  it('honours an explicit stemlm off flag', () => {
    expect(hydrateSettings({ stemlmEnabled: false }).stemlmEnabled).toBe(false);
  });
});

describe('setSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete storageData[KEY];
    delete storageData[ENABLED_FLAG_KEY];
    localStorage.removeItem(ENABLED_BOOT_KEY);
  });

  it('clamps splitRatio before persisting', async () => {
    const next = await setSettings({ splitRatio: 0.05 });
    expect(next.splitRatio).toBe(0.25);
    expect((storageData[KEY] as { splitRatio: number }).splitRatio).toBe(0.25);
  });

  it('round-trips through getSettings', async () => {
    await setSettings({ shareAcrossTabs: true, defaultView: 'solution' });
    const loaded = await getSettings();
    expect(loaded.shareAcrossTabs).toBe(true);
    expect(loaded.defaultView).toBe('solution');
    expect(loaded.stemlmEnabled).toBe(true);
    expect(loaded).not.toHaveProperty('defaultSubject');
  });

  it('persists turning stemlm off', async () => {
    const next = await setSettings({ stemlmEnabled: false });
    expect(next.stemlmEnabled).toBe(false);
    expect((storageData[KEY] as { stemlmEnabled: boolean }).stemlmEnabled).toBe(false);
    expect(storageData[ENABLED_FLAG_KEY]).toBe(false);
    expect((await getSettings()).stemlmEnabled).toBe(false);
  });

  it('keeps stemlm off across a later getSettings even if the settings blob is stale', async () => {
    await writeStemlmEnabled(false);
    storageData[KEY] = { ...(storageData[KEY] as object), stemlmEnabled: true };
    expect((await getSettings()).stemlmEnabled).toBe(false);
  });

  it('keeps stemlm off if only the dedicated flag was written (popup closed mid-merge)', async () => {
    storageData[ENABLED_FLAG_KEY] = false;
    expect((await getSettings()).stemlmEnabled).toBe(false);
    await writeStemlmEnabled(true);
    expect((await getSettings()).stemlmEnabled).toBe(true);
    expect(storageData[ENABLED_FLAG_KEY]).toBe(true);
  });
});

describe('stemlm enabled boot cache', () => {
  beforeEach(() => {
    localStorage.removeItem(ENABLED_BOOT_KEY);
  });

  it('defaults to on, then remembers off until it is turned on again', () => {
    expect(stemlmEnabledFromBootCache()).toBe(true);
    persistStemlmEnabledBoot(false);
    expect(stemlmEnabledFromBootCache()).toBe(false);
    persistStemlmEnabledBoot(true);
    expect(stemlmEnabledFromBootCache()).toBe(true);
  });
});
