import { useState } from 'react';
import { IconLayers, IconSpark } from './icons';
import { getController } from '@/src/content/controller';

/**
 * Shown when the panel is open but there is no active session — typically after
 * clicking the toolbar icon. Lets the student rebuild the workspace from the
 * chatbot's own history.
 */
export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');

  function load() {
    const n = getController()?.loadConversation() ?? 0;
    if (n === 0) setStatus('none');
  }

  return (
    <div className="slm-empty">
      <div className="slm-empty-mark">
        <IconSpark width={26} height={26} />
      </div>
      <h2 className="slm-empty-title">Your study workspace</h2>
      <p className="slm-empty-text">
        Type a question in the chat, then tap the <strong>stemLM</strong> button next to the input.
        We’ll turn the answer into clear, step-by-step cards with diagrams here.
      </p>
      <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
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
