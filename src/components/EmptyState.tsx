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

export function EmptyState() {
  const [status, setStatus] = useState<'idle' | 'none'>('idle');
  const [canLoad, setCanLoad] = useState(false);
  const [busy, setBusy] = useState(false);
  // The banner above already explains an unreadable answer; do not also offer it as loadable.
  const failed = useStore((s) => s.status === 'error');
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    setCanLoad(getController()?.hasConversationToLoad() ?? false);
  }, []);

  async function load() {
    if (busy) return;
    setBusy(true);
    try {
      const n = (await getController()?.loadConversation()) ?? 0;
      if (n === 0) setStatus('none');
      else setCanLoad(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="slm-empty">
      <div className="slm-empty-preview" aria-hidden="true">
        <StemMark size={40} variant={themeToBrandVariant(theme)} />
      </div>
      <h2 className="slm-empty-title">Study workspace</h2>
      {canLoad && !failed ? (
        <>
          <p className="slm-empty-text">
            This chat has stemlm answers that aren't loaded yet.
          </p>
          <button type="button" className="slm-btn slm-btn-soft slm-empty-load" onClick={load} disabled={busy} aria-busy={busy}>
            <IconLayers /> Load conversation from this chat
          </button>
        </>
      ) : (
        <>
          <p className="slm-empty-text">Type a question in the chat, then start stemlm.</p>
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
        </>
      )}
      {status === 'none' && (
        <p className="slm-empty-hint">
          The response could not be loaded. See the message above for details.
        </p>
      )}
    </div>
  );
}
