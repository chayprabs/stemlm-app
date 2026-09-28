import { useEffect, useRef, useState } from 'react';
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

type CopyState = 'idle' | 'copied' | 'failed';
type SendState = 'idle' | 'sending' | 'added';

const RESET_MS = 1400;

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
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [sendState, setSendState] = useState<SendState>('idle');
  const sendingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAsk = isAskIntent(intent);
  const displayFollowup = isAsk ? hint ?? null : stripProtocolMarkers(followup);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  function buildPrompt() {
    return buildFollowupCopyText({
      selection: followup,
      stepTitle,
      subject,
      intent,
    });
  }

  function flashCopy(next: CopyState) {
    setCopyState(next);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), RESET_MS);
  }

  async function copy() {
    if (isEmptyFollowupSelection(followup)) return;
    try {
      await navigator.clipboard.writeText(buildPrompt());
      flashCopy('copied');
    } catch {
      flashCopy('failed');
      useStore
        .getState()
        .setStatus('error', 'Could not copy to clipboard. Select the text and copy manually.');
    }
  }

  async function ask() {
    if (isEmptyFollowupSelection(followup) || sendingRef.current) return;
    const ctrl = getController();
    if (!ctrl) {
      useStore
        .getState()
        .setStatus('error', 'stemlm is not ready on this page. Reload the tab and try again.');
      return;
    }
    sendingRef.current = true;
    setSendState('sending');
    try {
      const ok = await ctrl.followUp(followup, stepTitle, subject, { intent, anchor });
      if (ok !== false) {
        setSendState('added');
        resetTimer.current = setTimeout(() => setSendState('idle'), RESET_MS);
        return;
      }
    } catch {
      // The controller can fail on a detached provider tab or rejected runtime
      // message. Keep the panel usable and make the failure actionable.
    }
    if (useStore.getState().status !== 'error') {
      useStore
        .getState()
        .setStatus('error', 'Could not send the follow-up to the chat box. Click in the input and try again.');
    }
    setSendState('idle');
    sendingRef.current = false;
    return;
  }

  function askFinished() {
    if (sendState === 'sending') return 'Adding…';
    if (sendState === 'added') return 'Added to chat';
    return 'Ask in chat';
  }

  function copyLabel() {
    if (copyState === 'copied') return 'Copied';
    if (copyState === 'failed') return 'Copy failed';
    return 'Copy';
  }

  /** One spoken sentence per completed action — buttons alone are not announced. */
  function liveMessage() {
    if (sendState === 'sending') return 'Adding the follow-up to the chat box.';
    if (sendState === 'added') return 'Follow-up added to the chat box. Send it to get an answer.';
    if (copyState === 'copied') return 'Follow-up prompt copied to the clipboard.';
    if (copyState === 'failed') return 'Could not copy the follow-up prompt.';
    return '';
  }

  return (
    <div className={`slm-followup ${isAsk ? 'slm-followup--ask' : 'slm-followup--deeper'}`}>
      <div className="slm-followup-copyblock">
        <span className="slm-followup-label">{isAsk ? 'Ask in chat' : 'Dig deeper'}</span>
        {displayFollowup && <p className="slm-followup-text">{displayFollowup}</p>}
      </div>
      <div className="slm-followup-actions">
        <button
          type="button"
          className="slm-followup-action"
          onClick={() => void copy()}
          data-state={copyState === 'idle' ? undefined : copyState}
        >
          <IconCopy /> {copyLabel()}
        </button>
        <button
          type="button"
          className="slm-followup-action slm-followup-action--ask"
          onClick={() => void ask().finally(() => {
            sendingRef.current = false;
          })}
          disabled={sendState === 'sending'}
          aria-busy={sendState === 'sending'}
          data-state={sendState === 'idle' ? undefined : sendState}
        >
          <IconReply /> {askFinished()}
        </button>
      </div>
      <span className="slm-sr-only" role="status" aria-live="polite">
        {liveMessage()}
      </span>
    </div>
  );
}
