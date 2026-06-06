import { useState } from 'react';
import { IconCopy, IconReply } from './icons';
import { getController } from '@/src/content/controller';
import { buildFollowupPrompt } from '@/src/protocol/builder';
import { useStore } from '@/src/state/store';
import type { Subject } from '@/src/protocol/types';

/**
 * Per-step actions: copy the ready-made follow-up prompt, or send it straight
 * into the chatbot (re-arming capture so the deeper answer lands in the panel).
 */
export function FollowupBar({
  followup,
  subject,
  stepTitle,
}: {
  followup: string;
  subject: Subject;
  stepTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const promptVariant = useStore((s) => s.settings.promptVariant);

  function buildPrompt() {
    return buildFollowupPrompt({
      selection: followup,
      stepTitle,
      subject,
      variant: promptVariant,
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      useStore
        .getState()
        .setStatus('error', 'Could not copy to clipboard. Select the text and copy manually.');
    }
  }

  async function ask() {
    const ok = await getController()?.followUp(followup, stepTitle, subject);
    if (ok === false) return;
  }

  return (
    <div className="slm-followup">
      <span className="slm-followup-label">Dig deeper</span>
      <p className="slm-followup-text">{followup}</p>
      <div className="slm-followup-actions">
        <button type="button" className="slm-btn slm-btn-ghost" onClick={copy}>
          <IconCopy /> {copied ? 'Copied' : 'Copy prompt'}
        </button>
        <button type="button" className="slm-btn slm-btn-soft" onClick={() => void ask()}>
          <IconReply /> Ask in chat
        </button>
      </div>
    </div>
  );
}
