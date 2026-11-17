import { useEffect, useRef, useState } from 'react';
import { IconCopy, IconReply } from './icons';
import { MathMarkdown } from './MathMarkdown';
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
import { COPY_FAILED, useCopy } from './use-copy';

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
  suggestion,
}: {
  followup: string;
  subject: Subject;
  stepTitle: string;
  intent?: FollowupIntent;
  /** When set, the answer is attached inline after this step in the rail. */
  anchor?: { sessionId: string; anchorStepId: string };
  /** Optional helper text shown under the label. */
  hint?: string;
  /** A question the answer itself suggests: one press puts it in the chat box, nothing to retype. */
  suggestion?: string;
}) {
  const [copyState, copyText] = useCopy(() => useStore.getState().setStatus('error', COPY_FAILED));
  const [sendState, setSendState] = useState<SendState>('idle');
  const sendingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAsk = isAskIntent(intent);
  const displayFollowup = isAsk ? hint ?? null : stripProtocolMarkers(followup);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function buildPrompt() {
    return buildFollowupCopyText({
      selection: followup,
      stepTitle,
      subject,
      intent,
    });
  }

  async function copy() {
    if (!isEmptyFollowupSelection(followup)) await copyText(buildPrompt);
  }

  /** Put the follow-up in the chat box. `question`: the suggestion, written into the slot for the student. */
  async function ask(question?: string) {
    if (isEmptyFollowupSelection(followup) || sendingRef.current) return;
    const ctrl = getController();
    if (!ctrl) {
      useStore
        .getState()
        .setStatus('error', 'stemLM is not ready on this page. Reload the tab and try again.');
      return;
    }
    sendingRef.current = true;
    setSendState('sending');
    try {
      const ok = await ctrl.followUp(followup, stepTitle, subject, { intent, anchor, question });
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
        .setStatus('error', 'Could not send the follow-up to the chat box. Click in the chat box and try again.');
    }
    setSendState('idle');
    sendingRef.current = false;
    return;
  }

  const send = (question?: string) => void ask(question).finally(() => {
    sendingRef.current = false;
  });

  function askFinished() {
    if (sendState === 'sending') return 'Adding…';
    if (sendState === 'added') return 'Added to chat';
    return 'Ask in chat';
  }

  function copyLabel() {
    if (copyState === 'copied') return 'Copied';
    if (copyState === 'failed') return 'Copy failed';
    return 'Copy prompt';
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
        {suggestion ? (
          <p className="slm-followup-text">
            <button
              type="button"
              className="slm-followup-suggest"
              onClick={() => send(suggestion)}
              disabled={sendState === 'sending'}
              title="Put this question in the chat box"
            >
              Try: <MathMarkdown content={suggestion} inline />
            </button>
          </p>
        ) : (
          displayFollowup && <p className="slm-followup-text"><MathMarkdown content={displayFollowup} inline /></p>
        )}
      </div>
      <div className="slm-followup-actions">
        <button
          type="button"
          className="slm-followup-action"
          onClick={() => void copy()}
          data-state={copyState === 'idle' ? undefined : copyState}
          title="Copy this follow-up as a message you can paste into any chat"
        >
          <IconCopy /> {copyLabel()}
        </button>
        <button
          type="button"
          className="slm-followup-action slm-followup-action--ask"
          onClick={() => send()}
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
