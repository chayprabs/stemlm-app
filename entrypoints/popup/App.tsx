import { useEffect, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { getSavedSessions, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ResolvedTheme } from '@/src/lib/theme';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { SavedSessionList } from '@/src/components/SavedSessionList';
import { SavedLibraryOverlay } from '@/src/components/SavedLibraryOverlay';
import { IconHistory, IconPlay, IconPlus, IconSettings, IconSpark } from '@/src/components/icons';
import { getActiveTab } from '@/src/lib/tab-bridge';
import { getLastChat, type LastChatRecord } from '@/src/lib/last-chat';
import {
  launchTiles,
  openSavedQuestionsLibrary,
  runLaunchAction,
  unsupportedHostNotice,
  type LaunchId,
} from '@/src/lib/popup-launch';
import { isSupportedChatUrl, supportedChatLabels } from '@/src/platforms/detect';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';

const TILE_ICONS: Record<LaunchId, ReactNode> = {
  'start-here': <IconPlay width={16} height={16} />,
  'start-new': <IconPlus width={16} height={16} />,
  'open-last': <IconHistory width={16} height={16} />,
  'ask-here': <IconSpark width={16} height={16} />,
};

export default function App() {
  const [saved, setSaved] = useState<SavedSessionSnapshot[]>([]);
  const [supported, setSupported] = useState(false);
  const [lastChat, setLastChat] = useState<LastChatRecord | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ResolvedTheme>('light');
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      setTheme(resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
    });
    getSavedSessions().then(setSaved);
    getLastChat().then(setLastChat);

    const refreshTab = () => {
      void getActiveTab().then((tab) => setSupported(isSupportedChatUrl(tab?.url)));
    };
    refreshTab();

    const onActivated = () => refreshTab();
    const onUpdated = (_id: number, info: { url?: string }) => {
      if (info.url) refreshTab();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    const stopToolbar = watchAndApplyToolbarIcon();
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      stopToolbar();
    };
  }, []);

  function openOptions() {
    void browser.runtime.openOptionsPage().catch(() => {
      /* options page unavailable */
    });
  }

  async function onLaunch(id: LaunchId) {
    setSendError(null);
    const result = await runLaunchAction(id);
    if (result.ok) {
      if (id === 'start-here' || id === 'ask-here' || id === 'open-last') {
        void getLastChat().then(setLastChat);
      }
      window.close();
      return;
    }
    if ('error' in result) {
      setSendError(result.error);
    }
  }

  async function onOpenAllSaved() {
    const target = await openSavedQuestionsLibrary();
    if (target === 'tab') {
      window.close();
      return;
    }
    setLibraryOpen(true);
  }

  const tiles = launchTiles({ supported, hasLastChat: lastChat != null });
  const visibleTiles = tiles.filter((tile) => tile.visible);

  return (
    <div className="slm-popup">
      <header className="slm-popup-head">
        <h1>
          <BrandWordmark variant={themeToBrandVariant(theme)} height={30} />
        </h1>
        <button
          type="button"
          className="slm-popup-settings"
          aria-label="Settings"
          title="Settings"
          onClick={openOptions}
        >
          <IconSettings />
        </button>
      </header>

      <section className="slm-popup-card" aria-label="Start stemLM">
        {!supported && (
          <p className="slm-popup-notice" role="status">
            {unsupportedHostNotice(supportedChatLabels())}
          </p>
        )}
        <div className="slm-launch-grid">
          {visibleTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              data-launch={tile.id}
              className={`slm-launch-tile ${tile.emphasis === 'primary' ? 'is-primary' : ''}`}
              disabled={tile.disabled}
              title={
                tile.id === 'open-last' && tile.disabled ? 'No recent stemLM chat' : tile.label
              }
              onClick={() => void onLaunch(tile.id)}
            >
              <span className="slm-launch-icon" aria-hidden="true">
                {TILE_ICONS[tile.id]}
              </span>
              <span className="slm-launch-label">{tile.label}</span>
            </button>
          ))}
        </div>
        {sendError && <p className="slm-popup-error">{sendError}</p>}
      </section>

      <SavedSessionList
        sessions={saved}
        onSessionsChange={setSaved}
        variant="compact"
        onOpenAll={() => void onOpenAllSaved()}
      />

      {libraryOpen && (
        <SavedLibraryOverlay
          sessions={saved}
          onSessionsChange={setSaved}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}