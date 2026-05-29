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
  /** Auto-open the panel when a prompt is injected. */
  autoOpenOnInject: boolean;
  /** Per-platform enable toggles for the overlay button. */
  enabledPlatforms: Record<PlatformId, boolean>;
  /** Default subject routing for injection. */
  defaultSubject: Subject | 'Auto';
  /** Opt out of anonymous usage analytics. */
  analyticsOptOut: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  shareAcrossTabs: false,
  autoOpenOnInject: true,
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
};

const KEY = 'stemlm_settings';

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      enabledPlatforms: { ...DEFAULT_SETTINGS.enabledPlatforms, ...stored?.enabledPlatforms },
    };
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
      cb({
        ...DEFAULT_SETTINGS,
        ...(changes[KEY].newValue as Partial<Settings>),
      });
    }
  };
  browser.storage.onChanged.addListener(handler);
  return () => browser.storage.onChanged.removeListener(handler);
}
