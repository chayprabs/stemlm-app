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

export interface PanelMessageResult {
  ok: boolean;
  loaded?: number;
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
    useStore.getState().openPanel();
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
    if (!store.buttonInjected) {
      const ok = (await getController()?.inject()) ?? false;
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

  return { ok: false };
}

/** Content-script boot: run a toolbar launch that was armed before this tab loaded. */
export async function consumePendingPanelAction(
  tabId: number,
  platform: PlatformId,
): Promise<PanelMessageResult | null> {
  const pending = await takePendingPanelAction(tabId);
  if (!pending) return null;
  const result = await handleStemLmPanelMessage(pending, platform);
  await setPanelActionResult(tabId, result);
  return result;
}