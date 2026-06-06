/**
 * Handle toolbar / popup requests to open the study panel or reload the chat.
 */
import type { StemLmMessage } from '@/src/lib/messages';
import { getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';

export interface PanelMessageResult {
  ok: boolean;
  loaded?: number;
}

export async function handleStemLmPanelMessage(
  type: StemLmMessage['type'],
  platform: 'gemini',
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
      void trackEvent('panel_opened', { platform, source: 'toolbar' });
    }
    return { ok: true, loaded: count };
  }

  return { ok: false };
}
