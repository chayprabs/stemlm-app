import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { getSavedSessions, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';
import { getSettings } from '@/src/lib/settings';
import { resolveTheme, applyTheme, type ResolvedTheme } from '@/src/lib/theme';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { SavedSessionList } from '@/src/components/SavedSessionList';
import { IconLayers, IconSettings } from '@/src/components/icons';
import {
  deliverStemLmMessage,
  getActiveTab,
  isGeminiUrl,
  openGeminiTab,
  type DeliverableStemLmMessage,
} from '@/src/lib/tab-bridge';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';

export default function App() {
  const [saved, setSaved] = useState<SavedSessionSnapshot[]>([]);
  const [onGemini, setOnGemini] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      setTheme(resolved);
      applyTheme(document.documentElement, resolved);
      applyTheme(document.body, resolved);
    });
    getSavedSessions().then(setSaved);

    const refreshTab = () => {
      void getActiveTab().then((tab) => setOnGemini(isGeminiUrl(tab?.url)));
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

  async function send(type: DeliverableStemLmMessage) {
    setSendError(null);
    try {
      const res = await deliverStemLmMessage(type);
      if (type === 'stemlm:load-conversation' && (res.loaded ?? 0) === 0) {
        setSendError('No stemLM answers found in this chat. Use stemLM on a question first.');
        return;
      }
      window.close();
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'not-gemini') {
        setSendError('Open gemini.google.com first.');
      } else if (code === 'no-active-tab') {
        setSendError('No active tab found.');
      } else {
        setSendError('Could not reopen stemLM on this tab. Try refreshing Gemini.');
      }
    }
  }

  function openOptions() {
    void browser.runtime.openOptionsPage().catch(() => {
      /* options page unavailable */
    });
  }

  async function onPrimary() {
    if (onGemini) {
      await send('stemlm:open-panel');
      return;
    }
    setSendError(null);
    try {
      await openGeminiTab();
      window.close();
    } catch {
      setSendError('Could not open Gemini. Try gemini.google.com.');
    }
  }

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

      <section className="slm-popup-card" aria-label="Quick actions">
        <div className="slm-popup-actions">
          <button
            type="button"
            className="slm-popup-btn primary"
            onClick={() => void onPrimary()}
            title={onGemini ? 'Open the study panel' : 'Open Gemini'}
          >
            {onGemini ? 'Open study panel' : 'Open Gemini'}
          </button>
          <button
            type="button"
            className="slm-popup-btn"
            onClick={() => send('stemlm:load-conversation')}
            disabled={!onGemini}
            title={onGemini ? 'Load this chat into the study panel' : 'Open Gemini first'}
          >
            <IconLayers width={15} height={15} />
            Load conversation from this chat
          </button>
        </div>

        {!onGemini && (
          <p className="slm-popup-hint">
            Open Gemini, type your question, then click the stemLM button beside send.
          </p>
        )}
        {sendError && <p className="slm-popup-error">{sendError}</p>}
      </section>

      <SavedSessionList
        sessions={saved}
        onSessionsChange={setSaved}
        onDownloaded={() => window.close()}
      />
    </div>
  );
}
