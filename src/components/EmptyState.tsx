import { useEffect, useState } from 'react';
import { IconLayers } from './icons';
import { getController } from '@/src/content/controller';

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');
  const [canLoad, setCanLoad] = useState(false);

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
      {canLoad ? (
        <>
          <p className="slm-empty-text">
            This chat has stemLM answers that aren't loaded yet.
          </p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
            <IconLayers /> Load conversation from this chat
          </button>
        </>
      ) : (
        <p className="slm-empty-text">Type a question in the chat, then start stemLM.</p>
      )}
      {status === 'none' && (
        <p className="slm-empty-hint">
          No stemLM answers found in this chat. Use stemLM on a question first.
        </p>
      )}
    </div>
  );
}
