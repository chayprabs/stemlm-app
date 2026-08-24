import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ResolvedTheme } from '@/src/lib/theme';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { SavedLibraryOverlay } from '@/src/components/SavedLibraryOverlay';
import { IconPanel, IconSave, IconSettings } from '@/src/components/icons';
import { HostLogo } from '@/src/components/host-logos';
import { getActiveTab } from '@/src/lib/tab-bridge';
import {
  CHAT_HOST_LAUNCH,
  openChatHost,
  openSavedQuestionsLibrary,
  openStudyPanel,
} from '@/src/lib/popup-launch';
import { isSupportedChatUrl } from '@/src/platforms/detect';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';
import type { PlatformId } from '@/src/platforms/types';

export default function App() {
  const [supported, setSupported] = useState(false);
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

  async function onOpenPanel() {
    setSendError(null);
    const result = await openStudyPanel();
    if (result.ok) {
      window.close();
      return;
    }
    if ('error' in result) setSendError(result.error);
  }

  async function onOpenLibrary() {
    setSendError(null);
    const target = await openSavedQuestionsLibrary();
    if (target === 'window' || target === 'tab') {
      window.close();
      return;
    }
    setLibraryOpen(true);
  }

  async function onOpenHost(id: PlatformId) {
    setSendError(null);
    const result = await openChatHost(id);
    if (result.ok) {
      window.close();
      return;
    }
    if ('error' in result) setSendError(result.error);
  }

  return (
    <div className="slm-popup">
      <header className="slm-popup-head">
        <h1>
          <BrandWordmark variant={themeToBrandVariant(theme)} height={24} />
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

      <div className="slm-popup-actions">
        <button
          type="button"
          data-launch="open-study-panel"
          className="slm-popup-action is-primary"
          onClick={() => void onOpenPanel()}
        >
          <span className="slm-popup-action-icon" aria-hidden="true">
            <IconPanel width={15} height={15} />
          </span>
          Open study panel
        </button>
        <button
          type="button"
          data-launch="saved-questions"
          className="slm-popup-action"
          onClick={() => void onOpenLibrary()}
        >
          <span className="slm-popup-action-icon" aria-hidden="true">
            <IconSave width={15} height={15} />
          </span>
          Saved questions
        </button>
      </div>
      {sendError && <p className="slm-popup-error">{sendError}</p>}

      <section className="slm-popup-hosts" aria-label="Open a supported chat">
        <p className="slm-popup-hosts-label">{supported ? 'Study on' : 'Open a chat'}</p>
        <div className="slm-popup-host-row">
          {CHAT_HOST_LAUNCH.map((host) => (
            <button
              key={host.id}
              type="button"
              data-host={host.id}
              className="slm-popup-host"
              title={host.label}
              aria-label={host.label}
              onClick={() => void onOpenHost(host.id)}
            >
              <span className="slm-popup-host-logo" aria-hidden="true">
                <HostLogo id={host.id} size={18} />
              </span>
              <span className="slm-popup-host-name">{host.label}</span>
            </button>
          ))}
        </div>
      </section>

      {libraryOpen && <SavedLibraryOverlay onClose={() => setLibraryOpen(false)} />}
    </div>
  );
}
