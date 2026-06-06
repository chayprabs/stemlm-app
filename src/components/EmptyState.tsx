import { useState } from 'react';
import { StemMark, IconLayers } from './icons';
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
        <StemMark width={20} height={20} />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      <p className="slm-empty-text">
        Type your question in Gemini, then tap ✦ stemLM beside send. Your answer appears here
        as structured steps with formulas and diagrams.
      </p>
      <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load}>
        <IconLayers /> Load from conversation
      </button>
      {status === 'none' && (
        <p className="slm-empty-hint">
          No stemLM answers found in this chat. Use ✦ stemLM next to send to get started.
        </p>
      )}
    </div>
  );
}
