import { useState } from 'react';
import { IconLogo, IconLayers } from './icons';
import { getController } from '@/src/content/controller';

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');

  function load() {
    const n = getController()?.loadConversation() ?? 0;
    if (n === 0) setStatus('none');
  }

  return (
    <div className="slm-empty">
      <div className="slm-empty-mark">
        <IconLogo width={24} height={24} />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      <p className="slm-empty-text">
        Type your question in the chat, then tap the stemLM button beside the send control.
        Your answer will appear here as structured steps with formulas and diagrams.
      </p>
      <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
        <IconLayers /> Load from conversation
      </button>
      {status === 'none' && (
        <p className="slm-empty-hint">
          No stemLM answers found in this chat. Use the button next to send to get started.
        </p>
      )}
    </div>
  );
}
