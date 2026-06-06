/**
 * Handle toolbar / popup requests to open the study panel or reload the chat.
 */
import type { StemLmMessage } from '@/src/lib/messages';
import { getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';

export function handleStemLmPanelMessage(
  type: StemLmMessage['type'],
  platform: 'gemini',
): { ok: boolean } {
  if (type === 'stemlm:ping') {
    return { ok: true };
  }

  if (type === 'stemlm:open-panel') {
    useStore.getState().openPanel();
    void trackEvent('panel_opened', { platform, source: 'toolbar' });
    return { ok: true };
  }

  if (type === 'stemlm:load-conversation') {
    getController()?.loadConversation();
    useStore.getState().openPanel();
    return { ok: true };
  }

  return { ok: false };
}
