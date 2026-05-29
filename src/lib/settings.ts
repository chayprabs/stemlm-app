/**
 * User settings — persisted in storage.local and shared across the extension
 * (popup, options, content scripts). Kept tiny and focused per the brief: just
 * the small tweaks a user might want.
 */
import { browser } from 'wxt/browser';
import type { ThemePref } from './theme';
import type { Subject } from '@/src/protocol/types';
import type { PlatformId } from '@/src/platforms/types';

export interface Settings {
  theme: ThemePref;
  /** Share active (unsaved) sessions across tabs. Default off = each tab fresh. */
  shareAcrossTabs: boolean;
  /** Auto-open the study panel when the assistant starts answering. */
  autoOpenOnAnswer: boolean;
  /** Per-platform enable toggles for the overlay button. */
  enabledPlatforms: Record<PlatformId, boolean>;
  /** Default subject routing for injection. */
  defaultSubject: Subject | 'Auto';
  /** Opt out of anonymous usage analytics. */
  analyticsOptOut: boolean;
  /**
   * Split-screen width of the study panel as a fraction of the viewport
   * (0 = none, 1 = full). Shared across all chatbot sites via extension storage
   * (page localStorage would be per-origin). Clamped to [0.25, 0.75].
   */
  splitRatio: number;
}

/** Clamp a split ratio to the usable range. */
export function clampSplitRatio(r: number): number {
  if (!Number.isFinite(r)) return 0.5;
  return Math.min(0.75, Math.max(0.25, r));
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  shareAcrossTabs: false,
  autoOpenOnAnswer: true,
  enabledPlatforms: {
    chatgpt: true,
    claude: true,
    gemini: true,
    perplexity: true,
    grok: true,
    deepseek: true,
  },
  defaultSubject: 'Auto',
  analyticsOptOut: false,
  splitRatio: 0.5,
};

const KEY = 'stemlm_settings';

/** Merge stored settings over defaults, migrating any legacy keys. */
function hydrate(stored: Partial<Settings> & { autoOpenOnInject?: boolean } = {}): Settings {
  // Legacy: `autoOpenOnInject` was renamed to `autoOpenOnAnswer`.
  const autoOpenOnAnswer =
    stored.autoOpenOnAnswer ?? stored.autoOpenOnInject ?? DEFAULT_SETTINGS.autoOpenOnAnswer;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    autoOpenOnAnswer,
    splitRatio: clampSplitRatio(stored.splitRatio ?? DEFAULT_SETTINGS.splitRatio),
    enabledPlatforms: { ...DEFAULT_SETTINGS.enabledPlatforms, ...stored.enabledPlatforms },
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    return hydrate(stored);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = {
    ...current,
    ...patch,
    enabledPlatforms: { ...current.enabledPlatforms, ...patch.enabledPlatforms },
  };
  await browser.storage.local.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[KEY]?.newValue) {
      cb(hydrate(changes[KEY].newValue as Partial<Settings>));
    }
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
