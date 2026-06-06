/**
 * User settings — persisted in storage.local and shared across the extension
 * (popup, options, content scripts). Kept tiny and focused per the brief: just
 * the small tweaks a user might want.
 */
import { browser } from 'wxt/browser';
import type { ThemePref } from './theme';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import type { PromptVariant } from '@/src/protocol/protocol';
export interface Settings {
  theme: ThemePref;
  /** Share active (unsaved) sessions across tabs. Default off = each tab fresh. */
  shareAcrossTabs: boolean;
  /** Auto-open the study panel when the assistant starts answering. */
  autoOpenOnAnswer: boolean;
  /** Default subject routing for injection. */
  defaultSubject: Subject | 'Auto';
  /** Prompt protocol variant used for injected questions. */
  promptVariant: PromptVariant;
  /** Opt out of anonymous usage analytics. */
  analyticsOptOut: boolean;
  /**
   * Split-screen width of the study panel as a fraction of the viewport
   * (0 = none, 1 = full). Shared across Gemini tabs via extension storage
   * (page localStorage would be per-origin). Clamped to [0.25, 0.75].
   */
  splitRatio: number;
}

import { clampSplitRatio } from './split-ratio';
import { StorageQuotaError, isStorageQuotaError } from './storage-errors';

export { clampSplitRatio };

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  shareAcrossTabs: false,
  autoOpenOnAnswer: true,
  defaultSubject: 'Auto',
  promptVariant: 'balanced',
  analyticsOptOut: false,
  splitRatio: 0.5,
};

const KEY = 'stemlm_settings';

function normalizeTheme(value: unknown): ThemePref {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : DEFAULT_SETTINGS.theme;
}

function normalizeDefaultSubject(value: unknown): Subject | 'Auto' {
  if (value === 'Auto') return 'Auto';
  if (typeof value === 'string' && (SUBJECTS as readonly string[]).includes(value)) {
    return value as Subject;
  }
  return DEFAULT_SETTINGS.defaultSubject;
}

function normalizePromptVariant(value: unknown): PromptVariant {
  return value === 'ultra' || value === 'balanced' ? value : DEFAULT_SETTINGS.promptVariant;
}

/** Merge stored settings over defaults, migrating any legacy keys. */
export function hydrateSettings(
  stored: Partial<Settings> & { autoOpenOnInject?: boolean } = {},
): Settings {
  // Legacy: `autoOpenOnInject` was renamed to `autoOpenOnAnswer`.
  const autoOpenOnAnswer =
    stored.autoOpenOnAnswer ?? stored.autoOpenOnInject ?? DEFAULT_SETTINGS.autoOpenOnAnswer;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    theme: normalizeTheme(stored.theme),
    defaultSubject: normalizeDefaultSubject(stored.defaultSubject),
    autoOpenOnAnswer: Boolean(autoOpenOnAnswer),
    shareAcrossTabs: Boolean(stored.shareAcrossTabs),
    analyticsOptOut: Boolean(stored.analyticsOptOut),
    promptVariant: normalizePromptVariant(stored.promptVariant),
    splitRatio: clampSplitRatio(stored.splitRatio ?? DEFAULT_SETTINGS.splitRatio),
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    return hydrateSettings(stored);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = hydrateSettings({ ...current, ...patch });
  try {
    await browser.storage.local.set({ [KEY]: next });
  } catch (err) {
    if (isStorageQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
  return next;
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[KEY]?.newValue) {
      cb(hydrateSettings(changes[KEY].newValue as Partial<Settings>));
    }
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
