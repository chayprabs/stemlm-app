import { REMOVED_NOTICE, useStore } from '@/src/state/store';
import { EXTENSION_UPDATED_NOTICE } from '@/src/lib/extension-context';
import { IconClose } from './icons';
import { focusPanel } from './move-focus';

/**
 * The panel's status line. The first line says what happened and what to do;
 * anything after it is a technical detail kept behind "Details" (UX-ERR-01).
 * It stays until it is dismissed or the panel has something newer to say, and
 * the notice left by removing a question carries the way to put it back.
 */
export function ErrorBanner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  const [lead, ...rest] = message.split('\n');
  const detail = rest.join('\n').trim();
  const canUndo = useStore((s) => message === REMOVED_NOTICE && s.removed !== undefined);

  /** The pressed control leaves with the banner; focus goes to the panel so its keys keep working. */
  function leave(control: HTMLElement) {
    focusPanel(control.closest<HTMLElement>('.slm-panel'));
  }

  function dismiss(control: HTMLElement) {
    leave(control);
    const { status, sessions, setStatus } = useStore.getState();
    // An error that has been read is over: the panel goes back to what it was showing.
    setStatus(status === 'error' ? (sessions.length > 0 ? 'ready' : 'idle') : status);
  }

  function undo(control: HTMLElement) {
    leave(control);
    useStore.getState().restoreRemoved();
  }

  return (
    <div className={`slm-banner ${tone === 'error' ? 'slm-banner-error' : 'slm-banner-info'}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{lead}</span>
      {detail && (
        <details className="slm-banner-details">
          <summary>Details</summary>
          <p>{detail}</p>
        </details>
      )}
      <div className="slm-banner-actions">
        {canUndo && (
          <button type="button" className="slm-banner-undo" onClick={(e) => undo(e.currentTarget)}>
            Undo
          </button>
        )}
        {message === EXTENSION_UPDATED_NOTICE && (
          <button type="button" className="slm-banner-undo" onClick={() => window.location.reload()}>
            Reload
          </button>
        )}
        <button
          type="button"
          className="slm-icon-btn slm-banner-dismiss"
          aria-label="Dismiss message"
          title="Dismiss"
          onClick={(e) => dismiss(e.currentTarget)}
        >
          <IconClose width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
