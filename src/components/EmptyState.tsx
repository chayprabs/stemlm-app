import { useEffect, useId, useState } from 'react';
import { IconLayers, IconPaste } from './icons';
import { StemMark, themeToBrandVariant } from './brand';
import { getController } from '@/src/content/controller';
import { NO_ANSWER_NOTICE, useStore } from '@/src/state/store';

const HOW_IT_WORKS: Array<[string, string]> = [
  ['Ask', 'Type a question in the chat, or attach a photo of the problem.'],
  ['Attach', 'Press the stemlm button beside the chat box, then send.'],
  ['Study', 'The answer opens here as steps with formulas, figures and quick checks.'],
];

/** How often an empty panel looks at the chat again: an answer may finish while it is open. */
const RECHECK_MS = 1_500;

type Loadable = 'capsules' | 'answer' | null;

/**
 * The manual way in: an answer copied from any chat, pasted here and studied like any other. It
 * is what is left when a chat site has changed under stemLM and the page can no longer be read,
 * and the way to study an answer from a chat stemLM does not run on.
 */
function PasteAnswer() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [refused, setRefused] = useState(false);
  const id = useId().replaceAll(':', '');

  if (!open) {
    return (
      <button type="button" className="slm-btn slm-btn-ghost slm-paste-open" onClick={() => setOpen(true)}>
        <IconPaste width={15} height={15} /> Paste an answer
      </button>
    );
  }

  function close() {
    setOpen(false);
    setRefused(false);
  }

  return (
    <form
      className="slm-paste"
      onSubmit={(e) => {
        e.preventDefault();
        // An answer that is read takes this whole view away with it.
        setRefused(!getController()?.loadFromText(text));
      }}
      onKeyDown={(e) => {
        // Escape puts the form away; it does not close the panel under what was just pasted.
        if (e.key !== 'Escape' || e.nativeEvent.isComposing) return;
        e.stopPropagation();
        close();
      }}
    >
      <label className="slm-paste-label" htmlFor={`slm-paste-${id}`}>Paste an answer</label>
      <p className="slm-paste-help" id={`slm-paste-help-${id}`}>
        Copy a whole answer from any chat and paste it here. stemlm arranges it into steps. It does not check it.
      </p>
      <textarea
        id={`slm-paste-${id}`}
        className="slm-paste-field"
        rows={7}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setRefused(false);
        }}
        aria-describedby={`slm-paste-help-${id}${refused ? ` slm-paste-error-${id}` : ''}`}
        aria-invalid={refused || undefined}
        spellCheck={false}
        autoFocus
      />
      {refused && (
        <p className="slm-paste-error" id={`slm-paste-error-${id}`} role="alert">
          stemlm found no worked answer in this text. Paste the whole answer, from its first line to its last.
        </p>
      )}
      <div className="slm-paste-actions">
        <button type="button" className="slm-btn slm-btn-ghost" onClick={close}>Cancel</button>
        <button type="submit" className="slm-btn slm-btn-soft" disabled={!text.trim()}>Study this answer</button>
      </div>
    </form>
  );
}

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
  // The chat replied without an answer: the note above says so, and there is nothing of it to load.
  const unanswered = useStore((s) => s.errorMessage === NO_ANSWER_NOTICE);
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
      <h2 className="slm-empty-title">Study panel</h2>
      {loadable === 'capsules' && !failed && !unanswered && !drafting ? (
        <>
          <p className="slm-empty-text">
            This chat has stemlm answers that aren't loaded yet.
          </p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load} disabled={busy} aria-busy={busy}>
            <IconLayers /> Load this chat's answers
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
          <p className="slm-empty-text">Type a question in the chat, then press the stemlm button.</p>
          {howItWorks}
        </>
      ) : (
        <>
          <p className="slm-empty-text">Type a question in the chat, then press the stemlm button.</p>
          {/* The note above says the chat did not answer. This student has just used stemlm: no lesson in how. */}
          {!unanswered && howItWorks}
        </>
      )}
      {status === 'none' && (
        <p className="slm-empty-hint" role="status">
          {/* Only point at the status line when there is one to read. */}
          The answer could not be loaded.{' '}
          {explained ? 'See the message above for details.' : 'Ask the question again with the stemlm button.'}
        </p>
      )}
      <PasteAnswer />
    </div>
  );
}
