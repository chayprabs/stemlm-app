import { useEffect, useState } from 'react';
import { SavedSessionList } from './SavedSessionList';
import { BrandWordmark, themeToBrandVariant } from './brand';
import { IconClose } from './icons';
import { getSavedSessions, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import {
  applyTheme,
  persistThemeBoot,
  resolveTheme,
  themeFromBootCache,
  type ResolvedTheme,
  type ThemePref,
} from '@/src/lib/theme';

function applyLibraryPageTheme(
  pref: ThemePref,
  resolved: ResolvedTheme,
  layout: 'overlay' | 'page',
) {
  if (layout === 'page' || document.documentElement.classList.contains('slm-popup-page')) {
    persistThemeBoot(pref, resolved);
    applyTheme(document.documentElement, resolved);
    applyTheme(document.body, resolved);
  }
}

export function SavedLibraryOverlay({
  sessions,
  onSessionsChange,
  onClose,
  layout = 'overlay',
}: {
  sessions?: SavedSessionSnapshot[];
  onSessionsChange?: (sessions: SavedSessionSnapshot[]) => void;
  onClose: () => void;
  layout?: 'overlay' | 'page';
}) {
  const [items, setItems] = useState<SavedSessionSnapshot[]>(sessions ?? []);
  const [theme, setTheme] = useState<ResolvedTheme>(() => themeFromBootCache());

  useEffect(() => {
    if (sessions) {
      setItems(sessions);
      return;
    }
    void getSavedSessions().then(setItems);
  }, [sessions]);

  useEffect(() => {
    void getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      setTheme(resolved);
      applyLibraryPageTheme(s.theme, resolved, layout);
    });
  }, [layout]);

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
    <div
      className={`slm-library-overlay slm-library-overlay--${layout}`}
      data-stemlm-theme={theme}
      role="presentation"
    >
      {layout === 'overlay' && (
        <button
          type="button"
          className="slm-library-overlay-backdrop"
          aria-label="Close saved questions"
          onClick={onClose}
        />
      )}
      <div className="slm-library-dialog" role="dialog" aria-modal="true" aria-labelledby="slm-library-title">
        <div className="slm-library-dialog-head">
          <h2 id="slm-library-title" className="slm-library-dialog-title">
            <BrandWordmark variant={themeToBrandVariant(theme)} height={28} />
            <span className="slm-sr-only">Saved questions</span>
          </h2>
          <button type="button" className="slm-library-close" aria-label="Close" onClick={onClose}>
            <IconClose width={16} height={16} />
          </button>
        </div>
        <SavedSessionList sessions={items} onSessionsChange={onChange} />
      </div>
    </div>
  );
}
