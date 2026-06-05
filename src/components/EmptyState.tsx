import { useState } from 'react';
import { IconLayers } from './icons';
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
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }} aria-hidden="true">
          ✦
        </span>
      </div>
      <h2 className="slm-empty-title">Your study workspace</h2>
      <p className="slm-empty-text">
        Type a question in the chat, then click <strong>✦ stemLM</strong> beside the send button.
        Your answer becomes structured steps with formulas and diagrams here.
      </p>
      <button type="button" className="slm-btn slm-btn-soft" onClick={load}>
        <IconLayers /> Load conversation
      </button>
      {status === 'none' && (
        <p className="slm-empty-hint">
          No stemLM answers found in this chat yet. Ask one using the button to get started.
        </p>
      )}
    </div>
  );
}
