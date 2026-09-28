import { useEffect, useState } from 'react';
import { IconLayers } from './icons';
import { getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');
  const [canLoad, setCanLoad] = useState(false);
  // The banner above already explains an unreadable answer; do not also offer it as loadable.
  const failed = useStore((s) => s.status === 'error');

  useEffect(() => {
    setCanLoad(getController()?.hasConversationToLoad() ?? false);
  }, []);

  async function load() {
    const n = (await getController()?.loadConversation()) ?? 0;
    if (n === 0) setStatus('none');
    else setCanLoad(false);
  }

  return (
    <div className="slm-empty">
      <div className="slm-empty-preview" aria-hidden="true">
        <div className="slm-empty-preview-bar" />
        <div className="slm-empty-preview-line" />
        <div className="slm-empty-preview-line slm-empty-preview-line--short" />
        <div className="slm-empty-preview-block" />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      {canLoad && !failed ? (
        <>
          <p className="slm-empty-text">
            This chat has stemlm answers that aren't loaded yet.
          </p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
            <IconLayers /> Load conversation from this chat
          </button>
        </>
      ) : (
        <p className="slm-empty-text">Type a question in the chat, then start stemlm.</p>
      )}
      {status === 'none' && (
        <p className="slm-empty-hint">
          The response could not be loaded. See the message above for details.
        </p>
      )}
    </div>
  );
}
