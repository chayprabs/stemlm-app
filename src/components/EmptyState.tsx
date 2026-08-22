import { useState } from 'react';
import { IconLayers } from './icons';
import { getController } from '@/src/content/controller';

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');

  async function load() {
    const n = (await getController()?.loadConversation()) ?? 0;
    if (n === 0) setStatus('none');
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
      <p className="slm-empty-text">
        Type a question in the chat, then tap stemLM beside send.
      </p>
      <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
        <IconLayers /> Load from conversation
      </button>
      {status === 'none' && (
        <p className="slm-empty-hint">
          No stemLM answers found in this chat. Use stemLM next to send to get started.
        </p>
      )}
    </div>
  );
}
