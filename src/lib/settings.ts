/**
 * User settings — persisted in storage.local and shared across the extension
 * (popup, options, content scripts). Kept tiny and focused per the brief: just
 * the small tweaks a user might want.
 */
import { browser } from 'wxt/browser';
import type { ThemePref } from './theme';
/** Which panel tab a freshly opened answer lands on. */
export type DefaultView = 'steps' | 'solution';

export interface Settings {
  theme: ThemePref;
  /** Share active (unsaved) sessions across tabs. Default off = each tab fresh. */
  shareAcrossTabs: boolean;
  /** Auto-open the study panel when the assistant starts answering. */
  autoOpenOnAnswer: boolean;
  /** Tab shown when an answer opens: step-by-step or the full solution. */
  defaultView: DefaultView;
  /**
   * Show the composer + attach control. Default on = current behaviour.
   * Off hides only that button; the study panel and library still work.
   */
  stemlmEnabled: boolean;
  /**
   * Split-screen width of the study panel as a fraction of the viewport
   * (0 = none, 1 = full). Shared across Gemini tabs via extension storage
   * (page localStorage would be per-origin). Clamped to [0.25, 0.75].
   */
  splitRatio: number;
}

import { clampSplitRatio, DEFAULT_SPLIT_RATIO, hydrateSplitRatio } from './split-ratio';
import { StorageQuotaError, isStorageQuotaError } from './storage-errors';

export { clampSplitRatio, DEFAULT_SPLIT_RATIO, hydrateSplitRatio };

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  shareAcrossTabs: false,
  autoOpenOnAnswer: true,
  defaultView: 'steps',
  stemlmEnabled: true,
  splitRatio: DEFAULT_SPLIT_RATIO,
};

const KEY = 'stemlm_settings';
/** Dedicated on/off flag so a killed popup cannot lose the choice mid-merge. */
export const ENABLED_FLAG_KEY = 'stemlm_enabled';
/**
 * Extension-page first-paint cache for the popup switch.
 * Must NOT be written from content scripts — that would land in the host page.
 */
export const ENABLED_BOOT_KEY = 'stemlm_enabled_boot';

function readEnabledFlag(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function persistStemlmEnabledBoot(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_BOOT_KEY, enabled ? '1' : '0');
  } catch {
    /* private mode / tests without storage */
  }
}

/** Last popup paint of the stemlm switch. Default on when never set. */
export function stemlmEnabledFromBootCache(): boolean {
  try {
    const raw = localStorage.getItem(ENABLED_BOOT_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* private mode / tests without storage */
  }
  return DEFAULT_SETTINGS.stemlmEnabled;
}

function normalizeTheme(value: unknown): ThemePref {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : DEFAULT_SETTINGS.theme;
}

function normalizeDefaultView(value: unknown): DefaultView {
  return value === 'solution' || value === 'steps' ? value : DEFAULT_SETTINGS.defaultView;
}

type StoredSettings = Partial<Settings> & {
  autoOpenOnInject?: boolean;
  /** Legacy — subject is always auto-detected from the question now. */
  defaultSubject?: unknown;
  /** Legacy — a single in-depth protocol ships now. */
  promptVariant?: unknown;
  /** Legacy — the opt-out toggle was removed. */
  analyticsOptOut?: unknown;
};

/** Merge stored settings over defaults, migrating any legacy keys. */
export function hydrateSettings(stored: StoredSettings = {}): Settings {
  // Legacy: `autoOpenOnInject` was renamed to `autoOpenOnAnswer`.
  const autoOpenOnAnswer =
    stored.autoOpenOnAnswer ?? stored.autoOpenOnInject ?? DEFAULT_SETTINGS.autoOpenOnAnswer;
  const {
    defaultSubject: _legacyDefaultSubject,
    autoOpenOnInject: _legacyAutoOpenOnInject,
    promptVariant: _legacyPromptVariant,
    analyticsOptOut: _legacyAnalyticsOptOut,
    ...rest
  } = stored;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    theme: normalizeTheme(stored.theme),
    defaultView: normalizeDefaultView(stored.defaultView),
    autoOpenOnAnswer: Boolean(autoOpenOnAnswer),
    shareAcrossTabs: Boolean(stored.shareAcrossTabs),
    stemlmEnabled: Boolean(stored.stemlmEnabled ?? DEFAULT_SETTINGS.stemlmEnabled),
    splitRatio: hydrateSplitRatio(stored.splitRatio),
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    const flag = readEnabledFlag((await browser.storage.local.get(ENABLED_FLAG_KEY))[ENABLED_FLAG_KEY]);
    return hydrateSettings({
      ...stored,
      stemlmEnabled: flag ?? stored?.stemlmEnabled,
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = hydrateSettings({ ...current, ...patch });
  try {
    await browser.storage.local.set({ [KEY]: next, [ENABLED_FLAG_KEY]: next.stemlmEnabled });
  } catch (err) {
    if (isStorageQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
  return next;
}

/**
 * Pin stemlm on/off immediately, then merge it into the settings blob.
 * The dedicated flag is the source of truth if the popup is closed mid-write.
 */
export async function writeStemlmEnabled(enabled: boolean): Promise<Settings> {
  await browser.storage.local.set({ [ENABLED_FLAG_KEY]: enabled });
  try {
    return await setSettings({ stemlmEnabled: enabled });
  } catch {
    return hydrateSettings({ stemlmEnabled: enabled });
  }
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area !== 'local') return;
    if (!changes[KEY] && !changes[ENABLED_FLAG_KEY]) return;
    void getSettings().then(cb, () => cb(DEFAULT_SETTINGS));
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
