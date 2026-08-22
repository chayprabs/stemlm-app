/**
 * Toolbar action icon. Chrome ignores Firefox theme_icons, so we swap PNGs
 * with action.setIcon from extension pages (and via the background from
 * content scripts). Scheme is OS chrome, not the in-app theme setting.
 *
 * MDN / WXT: `dark-*.png` = dark glyph for light toolbars;
 * `light-*.png` = light glyph for dark toolbars.
 */
import { browser } from 'wxt/browser';
import { getSystemTheme, watchSystemTheme, type ResolvedTheme } from './theme';

export const SET_TOOLBAR_ICON = 'stemlm:set-toolbar-icon' as const;

export type ToolbarIconMessage = { type: typeof SET_TOOLBAR_ICON; theme: ResolvedTheme };

const SIZES = [16, 32, 48, 128] as const;

export function isToolbarIconMessage(msg: unknown): msg is ToolbarIconMessage {
  if (!msg || typeof msg !== 'object') return false;
  const type = (msg as { type?: unknown }).type;
  const theme = (msg as { theme?: unknown }).theme;
  return type === SET_TOOLBAR_ICON && (theme === 'light' || theme === 'dark');
}

export function toolbarIconPaths(scheme: ResolvedTheme): Record<string, string> {
  const variant = scheme === 'dark' ? 'light' : 'dark';
  return Object.fromEntries(SIZES.map((size) => [String(size), `icon/${variant}-${size}.png`]));
}

async function setActionIcon(scheme: ResolvedTheme): Promise<boolean> {
  const setIcon = browser.action?.setIcon;
  if (typeof setIcon !== 'function') return false;
  try {
    await setIcon({ path: toolbarIconPaths(scheme) });
    return true;
  } catch {
    return false;
  }
}

/** Apply from a context that has `action.setIcon` (background / popup / options). */
export async function applyToolbarIconInBackground(scheme: ResolvedTheme): Promise<void> {
  await setActionIcon(scheme);
}

/** Apply locally, or ask the background if this context cannot set the action icon. */
export async function applyToolbarIcon(scheme: ResolvedTheme): Promise<void> {
  if (await setActionIcon(scheme)) return;
  try {
    await browser.runtime.sendMessage({ type: SET_TOOLBAR_ICON, theme: scheme });
  } catch {
    /* background asleep / tests */
  }
}

export function watchAndApplyToolbarIcon(): () => void {
  void applyToolbarIcon(getSystemTheme());
  return watchSystemTheme((theme) => {
    void applyToolbarIcon(theme);
  });
}
