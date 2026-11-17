/**
 * Guards against Chrome's "Extension context invalidated" after reload/update.
 * Content scripts on an open tab keep running but `browser.runtime` APIs throw.
 */
import { browser } from 'wxt/browser';

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /extension context invalidated/i.test(error.message);
}

/** True when this content-script context can still call extension APIs. */
export function isExtensionContextValid(): boolean {
  try {
    return Boolean(browser.runtime?.id);
  } catch {
    return false;
  }
}

/** Shown, with a Reload button, when an action fails because stemLM was updated under an open tab. */
export const EXTENSION_UPDATED_NOTICE = 'stemLM was updated. Reload this page to keep using it.';

/** `message` for a failed action, unless the extension was updated under this tab: then the one way out. */
export function unlessUpdated(message: string): string {
  return isExtensionContextValid() ? message : EXTENSION_UPDATED_NOTICE;
}

/** Safe `runtime.getURL` — returns the path unchanged when the context is dead. */
export function extensionAssetUrl(path: string): string {
  if (!isExtensionContextValid()) return path;
  try {
    const runtime = browser.runtime as typeof browser.runtime & {
      getURL: (path: string) => string;
    };
    return runtime.getURL(path);
  } catch {
    return path;
  }
}
