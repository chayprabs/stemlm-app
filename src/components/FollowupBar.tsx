import { useState } from 'react';
import { IconCopy, IconReply } from './icons';
import { getController } from '@/src/content/controller';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import {
  buildFollowupCopyText,
  isAskIntent,
  isEmptyFollowupSelection,
  type FollowupIntent,
} from '@/src/protocol/builder';
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
  intent = 'dig-deeper',
  anchor,
  hint,
}: {
  followup: string;
  subject: Subject;
  stepTitle: string;
  intent?: FollowupIntent;
  /** When set, the answer is attached inline after this step in the rail. */
  anchor?: { sessionId: string; anchorStepId: string };
  /** Optional helper text shown under the label (e.g. suggested question). */
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const promptVariant = useStore((s) => s.settings.promptVariant);
  const isAsk = isAskIntent(intent);
  const displayFollowup = isAsk ? hint ?? null : stripProtocolMarkers(followup);

  function buildPrompt() {
    return buildFollowupCopyText({
      selection: followup,
      stepTitle,
      subject,
      variant: promptVariant,
      intent,
    });
  }

  async function copy() {
    if (isEmptyFollowupSelection(followup)) return;
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
    if (isEmptyFollowupSelection(followup)) return;
    const ctrl = getController();
    if (!ctrl) {
      useStore
        .getState()
        .setStatus('error', 'stemLM is not ready on this page. Reload the tab and try again.');
      return;
    }
    const ok = await ctrl.followUp(followup, stepTitle, subject, { intent, anchor });
    if (ok === false) {
      useStore
        .getState()
        .setStatus('error', 'Could not send the follow-up to the chat box. Click in the input and try again.');
    }
  }

  return (
    <div className={`slm-followup ${isAsk ? 'slm-followup--ask' : 'slm-followup--deeper'}`}>
      <div className="slm-followup-copyblock">
        <span className="slm-followup-label">{isAsk ? 'Ask in chat' : 'Dig deeper'}</span>
        {displayFollowup && <p className="slm-followup-text">{displayFollowup}</p>}
      </div>
      <div className="slm-followup-actions">
        <button type="button" className="slm-followup-action" onClick={copy}>
          <IconCopy /> {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="slm-followup-action slm-followup-action--ask" onClick={() => void ask()}>
          <IconReply /> Ask in chat
        </button>
      </div>
    </div>
  );
}
