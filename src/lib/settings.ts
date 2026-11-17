/**
 * User settings — persisted in storage.local and shared across the extension
 * (popup, options, content scripts). Kept tiny and focused per the brief: just
 * the small tweaks a user might want.
 */
import { browser } from 'wxt/browser';
import type { ThemePref } from './theme';
/** Which panel tab a freshly opened answer lands on. */
export type DefaultView = 'steps' | 'solution';
export type ContentScale = 1 | 2 | 3 | 4 | 5;
export const MIN_CONTENT_SCALE: ContentScale = 1;
export const MAX_CONTENT_SCALE: ContentScale = 5;
export const DEFAULT_CONTENT_SCALE: ContentScale = 2;

/**
 * Figure box multiplier per reading level, relative to the compile frame
 * (300x165 step, 340x185 solution). Level 2 shows figures 1.46x their frame so
 * 12px scene text reads just above body size and a figure fills most of the reading
 * column. Matches the CSS diagram tokens so the SVG and its frame agree.
 */
export const CONTENT_SCALE_DIAGRAM_FACTOR: Record<ContentScale, number> = {
  1: 1.31,
  2: 1.46,
  3: 1.64,
  4: 1.81,
  5: 1.99,
};

export interface Settings {
  theme: ThemePref;
  /** Share active (unsaved) sessions across tabs. Default off = each tab fresh. */
  shareAcrossTabs: boolean;
  /** Auto-open the study panel when the assistant starts answering. */
  autoOpenOnAnswer: boolean;
  /** Fold the chat site's own sidebar while the panel is open, and unfold it afterwards. */
  collapseHostSidebar: boolean;
  /** Fold stemlm's answer blocks, and its lines under the student's question, in the chat itself. */
  tidyChat: boolean;
  /** Tab shown when an answer opens: step-by-step or the full solution. */
  defaultView: DefaultView;
  /** Reading-size level for answer content. Panel chrome and PDF stay fixed. */
  contentScale: ContentScale;
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
  collapseHostSidebar: true,
  tidyChat: true,
  defaultView: 'steps',
  contentScale: DEFAULT_CONTENT_SCALE,
  stemlmEnabled: true,
  splitRatio: DEFAULT_SPLIT_RATIO,
};

const KEY = 'stemlm_settings';
const SPLIT_RATIO_USER_KEY = 'stemlm_split_ratio_user_set';
const SETTINGS_FIELD_KEYS: Partial<Record<keyof Settings, string>> = {
  theme: 'stemlm_setting_theme',
  shareAcrossTabs: 'stemlm_setting_shareAcrossTabs',
  autoOpenOnAnswer: 'stemlm_setting_autoOpenOnAnswer',
  collapseHostSidebar: 'stemlm_setting_collapseHostSidebar',
  tidyChat: 'stemlm_setting_tidyChat',
  defaultView: 'stemlm_setting_defaultView',
  contentScale: 'stemlm_setting_contentScale',
  stemlmEnabled: 'stemlm_setting_stemlmEnabled',
  splitRatio: 'stemlm_setting_splitRatio',
};
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

export function normalizeContentScale(value: unknown): ContentScale {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CONTENT_SCALE;
  return Math.min(MAX_CONTENT_SCALE, Math.max(MIN_CONTENT_SCALE, Math.round(value))) as ContentScale;
}

type StoredSettings = Partial<Settings> & {
  autoOpenOnInject?: boolean;
  /** Legacy — subject is always auto-detected from the question now. */
  defaultSubject?: unknown;
  /** Legacy — a single in-depth protocol ships now. */
  promptVariant?: unknown;
  /** Legacy — the opt-out toggle was removed. */
  analyticsOptOut?: unknown;
  splitRatioUserSet?: unknown;
};

/** Merge stored settings over defaults, migrating any legacy keys. */
export function hydrateSettings(
  stored: StoredSettings = {},
  options: { preserveLegacySplit?: boolean } = {},
): Settings {
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
    contentScale: normalizeContentScale(stored.contentScale),
    autoOpenOnAnswer: Boolean(autoOpenOnAnswer),
    collapseHostSidebar: Boolean(stored.collapseHostSidebar ?? DEFAULT_SETTINGS.collapseHostSidebar),
    tidyChat: Boolean(stored.tidyChat ?? DEFAULT_SETTINGS.tidyChat),
    shareAcrossTabs: Boolean(stored.shareAcrossTabs),
    stemlmEnabled: Boolean(stored.stemlmEnabled ?? DEFAULT_SETTINGS.stemlmEnabled),
    splitRatio: hydrateSplitRatio(stored.splitRatio, undefined, {
      preserveLegacyValues: options.preserveLegacySplit || stored.splitRatioUserSet === true,
    }),
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    const flag = readEnabledFlag((await browser.storage.local.get(ENABLED_FLAG_KEY))[ENABLED_FLAG_KEY]);
    const splitRatioUserSet =
      (await browser.storage.local.get(SPLIT_RATIO_USER_KEY))[SPLIT_RATIO_USER_KEY] === true;
    const fieldEntries = await Promise.all(
      Object.entries(SETTINGS_FIELD_KEYS).map(async ([field, key]) => [
        field,
        (await browser.storage.local.get(key))[key],
      ] as const),
    );
    const fieldOverrides = Object.fromEntries(
      fieldEntries.filter(([, value]) => value !== undefined),
    ) as Partial<Settings>;
    return hydrateSettings({
      ...stored,
      ...fieldOverrides,
      stemlmEnabled: flag ?? stored?.stemlmEnabled,
      splitRatioUserSet,
    }, { preserveLegacySplit: splitRatioUserSet });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = hydrateSettings({ ...current, ...patch }, {
    preserveLegacySplit: patch.splitRatio !== undefined || current.splitRatio === 0.75,
  });
  try {
    const fieldWrites: Record<string, unknown> = {};
    for (const [field, key] of Object.entries(SETTINGS_FIELD_KEYS)) {
      if (Object.prototype.hasOwnProperty.call(patch, field)) {
        fieldWrites[key!] = next[field as keyof Settings];
      }
    }
    await browser.storage.local.set({
      [KEY]: next,
      ...(patch.stemlmEnabled !== undefined ? { [ENABLED_FLAG_KEY]: next.stemlmEnabled } : {}),
      ...(patch.splitRatio !== undefined ? { [SPLIT_RATIO_USER_KEY]: true } : {}),
      ...fieldWrites,
    });
  } catch (err) {
    if (isStorageQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
  return getSettings();
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
    const fieldChanged = Object.values(SETTINGS_FIELD_KEYS).some((key) => Boolean(key && changes[key]));
    if (!changes[KEY] && !changes[ENABLED_FLAG_KEY] && !fieldChanged && !changes[SPLIT_RATIO_USER_KEY]) return;
    void getSettings().then(cb, () => cb(DEFAULT_SETTINGS));
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
