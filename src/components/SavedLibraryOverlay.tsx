import { useEffect, useState } from 'react';
import { SavedSessionList } from './SavedSessionList';
import { IconClose } from './icons';
import { getSavedSessions, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';

export function SavedLibraryOverlay({
  sessions,
  onSessionsChange,
  onClose,
}: {
  sessions?: SavedSessionSnapshot[];
  onSessionsChange?: (sessions: SavedSessionSnapshot[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SavedSessionSnapshot[]>(sessions ?? []);

  useEffect(() => {
    if (sessions) {
      setItems(sessions);
      return;
    }
    void getSavedSessions().then(setItems);
  }, [sessions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onChange(next: SavedSessionSnapshot[]) {
    setItems(next);
    onSessionsChange?.(next);
  }

  return (
    <div className="slm-library-overlay" role="presentation">
      <button
        type="button"
        className="slm-library-overlay-backdrop"
        aria-label="Close saved questions"
        onClick={onClose}
      />
      <div className="slm-library-dialog" role="dialog" aria-modal="true" aria-labelledby="slm-library-title">
        <div className="slm-library-dialog-head">
          <h2 id="slm-library-title" className="slm-library-dialog-title">
            Saved questions
          </h2>
          <button type="button" className="slm-library-close" aria-label="Close" onClick={onClose}>
            <IconClose width={16} height={16} />
          </button>
        </div>
        <SavedSessionList
          sessions={items}
          onSessionsChange={onChange}
          variant="full"
          hideHeading
        />
      </div>
    </div>
  );
}