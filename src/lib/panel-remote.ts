/**
 * Handle toolbar / popup requests to open the study panel, inject, or reload the chat.
 */
import type { StemLmMessage } from '@/src/lib/messages';
import { getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';
import { rememberCurrentChat } from '@/src/lib/last-chat';
import type { PlatformId } from '@/src/platforms/types';
import { setPanelActionResult, takePendingPanelAction } from '@/src/lib/tab-workspace';
import { setSettings } from '@/src/lib/settings';
import { DEFAULT_SPLIT_RATIO, MAX_SPLIT_RATIO } from '@/src/lib/split-ratio';

export interface PanelMessageResult {
  ok: boolean;
  loaded?: number;
  error?: string;
}

export async function handleStemLmPanelMessage(
  type: StemLmMessage['type'],
  platform: PlatformId,
): Promise<PanelMessageResult> {
  if (type === 'stemlm:ping') {
    const state = useStore.getState();
    return { ok: true, loaded: state.sessions.length };
  }

  if (type === 'stemlm:open-panel') {
    const store = useStore.getState();
    // A pre-settings build could leave the store at the 75% popup clamp while
    // its settings object still has the old default. Migrate only that
    // unsynchronised legacy state; an explicitly persisted 75% choice is valid.
    if (store.splitRatio === MAX_SPLIT_RATIO && store.settings.splitRatio !== store.splitRatio) {
      store.setSplitRatio(DEFAULT_SPLIT_RATIO);
      void setSettings({ splitRatio: DEFAULT_SPLIT_RATIO }).then(
        (next) => useStore.getState().setSettings(next),
        () => undefined,
      );
    }
    store.openPanel();
    void trackEvent('panel_opened', { platform, source: 'toolbar' });
    return { ok: true };
  }

  if (type === 'stemlm:load-conversation') {
    const waitMs = 12_000;
    const count = (await getController()?.loadConversation({ maxWaitMs: waitMs })) ?? 0;
    useStore.getState().openPanel();
    if (count > 0) {
      void rememberCurrentChat(platform);
      void trackEvent('panel_opened', { platform, source: 'toolbar' });
    }
    return { ok: true, loaded: count };
  }

  if (type === 'stemlm:ask-here') {
    const store = useStore.getState();
    if (!store.settings.stemlmEnabled) return { ok: false, error: 'stemlm-disabled' };
    const controller = getController();
    if (!store.buttonInjected || !controller?.isCurrentDraftInjected()) {
      if (store.buttonInjected) controller?.resetInjection();
      const ok = (await controller?.inject()) ?? false;
      if (!ok) {
        store.openPanel();
        return { ok: false };
      }
    }
    store.openPanel();
    void rememberCurrentChat(platform);
    void trackEvent('panel_opened', { platform, source: 'ask-here' });
    return { ok: true };
  }

  if (type === 'stemlm:open-saved-library') {
    useStore.getState().openSavedLibrary();
    return { ok: true };
  }

  if (type === 'stemlm:open-settings') {
    useStore.getState().openSettings();
    return { ok: true };
  }

  return { ok: false };
}

const OVERLAY_PENDING = new Set<StemLmMessage['type']>([
  'stemlm:open-saved-library',
  'stemlm:open-settings',
]);

/** Content-script boot: run a toolbar launch that was armed before this tab loaded. */
export async function consumePendingPanelAction(
  tabId: number,
  platform: PlatformId,
  isCurrent: () => boolean = () => true,
  remoteClaim = false,
): Promise<PanelMessageResult | null> {
  const pending = await takePendingPanelAction(tabId, remoteClaim);
  if (!pending) return null;
  if (!isCurrent()) {
    const result = { ok: false };
    await setPanelActionResult(tabId, result);
    return result;
  }
  // Stale settings/library launches used to reopen a floating card on the chat
  // page after a reload. Those sheets now live in the toolbar popup only.
  if (OVERLAY_PENDING.has(pending)) {
    const result = { ok: true };
    await setPanelActionResult(tabId, result);
    return result;
  }
  const result = await handleStemLmPanelMessage(pending, platform);
  await setPanelActionResult(tabId, result);
  return result;
}
