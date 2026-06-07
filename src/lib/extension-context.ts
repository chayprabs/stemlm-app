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

/** Safe `runtime.getURL` — returns the path unchanged when the context is dead. */
export function extensionAssetUrl(path: string): string {
  if (!isExtensionContextValid()) return path;
  try {
    return browser.runtime.getURL(path);
  } catch {
    return path;
  }
}
