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
    <div className="slm-empty" role="region" aria-label="Study workspace">
      <div className="slm-empty-mark" aria-hidden="true">
        <IconSpark width={26} height={26} />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      <p className="slm-empty-text">
        Ask a question in chat, then select the <strong>stemLM</strong> button in the prompt box.
        Answers appear here as structured, step-by-step cards.
      </p>
      <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
        <IconLayers /> Load from chat
      </button>
      {status === 'none' && (
        <p className="slm-empty-hint" role="status">
          No stemLM responses in this chat yet. Ask a question to get started.
        </p>
      )}
    </div>
  );
}
