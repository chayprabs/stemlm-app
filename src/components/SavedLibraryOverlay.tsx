import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { SavedSessionList } from './SavedSessionList';
import { BrandWordmark, themeToBrandVariant } from './brand';
import { IconClose } from './icons';
import { SAVED_QUESTIONS_LABEL } from '@/src/lib/saved-library';
import { useDialogFocus } from './use-dialog-focus';
import { SAVED_SESSIONS_KEY, readSavedSessions, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';
import { getSettings, onSettingsChanged, type Settings } from '@/src/lib/settings';
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
  // Until storage answers, the library is neither empty nor full: saying "Nothing saved yet"
  // for that moment, or after a failed read, would tell the student their work is gone.
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>(sessions ? 'ready' : 'loading');
  const [theme, setTheme] = useState<ResolvedTheme>(() => themeFromBootCache());
  const dialogRef = useDialogFocus<HTMLDivElement>('container');

  const reload = useCallback(
    () => readSavedSessions().then(
      (next) => {
        setItems(next);
        setLoad('ready');
      },
      () => setLoad('failed'),
    ),
    [],
  );

  useEffect(() => {
    if (sessions) {
      setItems(sessions);
      setLoad('ready');
      return;
    }
    void reload();
    // This window can stay open while questions are saved from a chat tab; follow the library.
    const onChanged = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && SAVED_SESSIONS_KEY in changes) void reload();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [sessions, reload]);

  useEffect(() => {
    const apply = (s: Settings) => {
      const resolved = resolveTheme(s.theme);
      setTheme(resolved);
      applyLibraryPageTheme(s.theme, resolved, layout);
    };
    void getSettings().then(apply);
    // The settings window can change the theme while this one is open.
    return onSettingsChanged(apply);
  }, [layout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest('.slm-library-time[data-open="true"]')) {
        return;
      }
      // While questions are being picked, Escape belongs to the list: it leaves the picker.
      if (dialogRef.current?.querySelector('.slm-library-select')) return;
      onClose();
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
      <div
        ref={dialogRef}
        className="slm-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slm-library-title"
        tabIndex={-1}
      >
        <div className="slm-library-frame">
          <div className="slm-library-dialog-head">
            <h2 id="slm-library-title" className="slm-library-dialog-title">
              <BrandWordmark variant={themeToBrandVariant(theme)} height={22} />
              <span className="slm-library-kicker">{SAVED_QUESTIONS_LABEL}</span>
            </h2>
            {load === 'ready' && items.length > 0 && (
              <span className="slm-library-count" aria-label={`${items.length} saved`}>{items.length}</span>
            )}
            <button type="button" className="slm-library-close" aria-label="Close" onClick={onClose}>
              <IconClose width={16} height={16} />
            </button>
          </div>
          {load === 'ready' && <SavedSessionList sessions={items} onSessionsChange={onChange} />}
          {load === 'loading' && <section className="slm-library-main" aria-label="Saved questions" aria-busy="true" />}
          {load === 'failed' && (
            <section className="slm-library-main" aria-label="Saved questions">
              <div className="slm-library-feed">
                <div className="slm-library-empty" role="alert">
                  <p className="slm-library-empty-title">Your saved questions could not be read.</p>
                  <p className="slm-library-empty-text">
                    Nothing has been deleted. Try again, or close this window and open it from the stemLM
                    toolbar button.
                  </p>
                  <button type="button" className="slm-library-clear" data-library="retry" onClick={() => void reload()}>
                    Try again
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
