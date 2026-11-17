/**
 * The one-time hint at the stemlm button. Written at install (entrypoints/background.ts), cleared by
 * the first press of the button or the hint's own close button, and then never shown again, in any tab.
 */
import { browser } from 'wxt/browser';

export const FIRST_RUN_HINT_KEY = 'stemlm_first_run_hint';

export async function firstRunHintPending(): Promise<boolean> {
  try {
    return (await browser.storage.local.get(FIRST_RUN_HINT_KEY))[FIRST_RUN_HINT_KEY] === true;
  } catch {
    return false;
  }
}

export function dismissFirstRunHint(): void {
  void Promise.resolve()
    .then(() => browser.storage.local.remove(FIRST_RUN_HINT_KEY))
    .catch(() => {});
}

/** Calls `listener` when the hint is dismissed anywhere, so a second open chat tab drops it too. */
export function onFirstRunHintDismissed(listener: () => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes[FIRST_RUN_HINT_KEY] && changes[FIRST_RUN_HINT_KEY].newValue !== true) listener();
  };
  try {
    browser.storage.onChanged.addListener(handler);
    return () => browser.storage.onChanged.removeListener(handler);
  } catch {
    return () => {};
  }
}
