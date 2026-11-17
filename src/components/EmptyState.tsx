import { useEffect, useState } from 'react';
import { IconLayers } from './icons';
import { StemMark, themeToBrandVariant } from './brand';
import { getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';

const HOW_IT_WORKS: Array<[string, string]> = [
  ['Ask', 'Type a question in the chat, or attach a photo of the problem.'],
  ['Attach', 'Press the stemlm button beside the chat box, then send.'],
  ['Study', 'The answer opens here as steps with formulas, figures and quick checks.'],
];

/** How often an empty panel looks at the chat again: an answer may finish while it is open. */
const RECHECK_MS = 1_500;

type Loadable = 'capsules' | 'answer' | null;

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');
  const [loadable, setLoadable] = useState<Loadable>(null);
  const [busy, setBusy] = useState(false);
  // The banner above already explains an unreadable answer; do not also offer it as loadable.
  const failed = useStore((s) => s.status === 'error');
  // A guide waiting in the chat box to be sent puts its own name on the page, which reads as an
  // earlier stemlm turn. Until that question is asked there is no answer of its own to load.
  const drafting = useStore((s) => s.buttonInjected);
  const explained = useStore((s) => Boolean(s.errorMessage));
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const check = () => setLoadable(getController()?.conversationToLoad() ?? null);
    check();
    const timer = window.setInterval(check, RECHECK_MS);
    return () => window.clearInterval(timer);
  }, []);

  async function load() {
    if (busy) return;
    setBusy(true);
    try {
      const n = (await getController()?.loadConversation()) ?? 0;
      if (n === 0) setStatus('none');
      else setLoadable(null);
    } finally {
      setBusy(false);
    }
  }

  const howItWorks = (
    <ol className="slm-empty-steps">
      {HOW_IT_WORKS.map(([name, text], i) => (
        <li key={name} className="slm-empty-step">
          <span className="slm-empty-step-n" aria-hidden="true">{i + 1}</span>
          <span className="slm-empty-step-copy">
            <strong>{name}</strong>
            {text}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className={`slm-empty ${loadable === 'answer' ? 'slm-empty--offer' : ''}`}>
      <div className="slm-empty-preview" aria-hidden="true">
        <StemMark size={40} variant={themeToBrandVariant(theme)} />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      {loadable === 'capsules' && !failed && !drafting ? (
        <>
          <p className="slm-empty-text">
            This chat has stemlm answers that aren't loaded yet.
          </p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load} disabled={busy} aria-busy={busy}>
            <IconLayers /> Load conversation from this chat
          </button>
        </>
      ) : loadable === 'answer' ? (
        <>
          {/* A plain answer is on offer even under an error banner: the banner is about another reply. */}
          <p className="slm-empty-text">This chat's latest answer can be studied here.</p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load} disabled={busy} aria-busy={busy}>
            <IconLayers /> Study the latest answer
          </button>
          <p className="slm-empty-note">stemlm arranges the answer as it was written. It does not check it.</p>
          <p className="slm-empty-or">Or ask a new question</p>
          <p className="slm-empty-text">Type a question in the chat, then start stemlm.</p>
          {howItWorks}
        </>
      ) : (
        <>
          <p className="slm-empty-text">Type a question in the chat, then start stemlm.</p>
          {howItWorks}
        </>
      )}
      {status === 'none' && (
        <p className="slm-empty-hint" role="status">
          {/* Only point at the status line when there is one to read. */}
          The response could not be loaded.{' '}
          {explained ? 'See the message above for details.' : 'Ask the question again with the stemlm button.'}
        </p>
      )}
    </div>
  );
}
