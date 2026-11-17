import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import {
  getSettings,
  onSettingsChanged,
  persistStemlmEnabledBoot,
  stemlmEnabledFromBootCache,
  writeStemlmEnabled,
} from '@/src/lib/settings';
import {
  resolveTheme,
  applyTheme,
  persistThemeBoot,
  themeFromBootCache,
  type ResolvedTheme,
} from '@/src/lib/theme';
import { BrandWordmark, themeToBrandVariant } from '@/src/components/brand';
import { IconCheck, IconChevronRight, IconCopy, IconPanel, IconSettings } from '@/src/components/icons';
import { useCopy } from '@/src/components/use-copy';
import { HostLogo } from '@/src/components/host-logos';
import { getActiveTab } from '@/src/lib/tab-bridge';
import {
  CHAT_HOST_LAUNCH,
  STEMLM_TOGGLE_LABEL,
  guideForPasting,
  openChatHost,
  openSavedQuestionsLibrary,
  openSettingsOverlay,
  openStudyPanel,
  openWelcomePage,
  unsupportedHostNotice,
  type LaunchResult,
} from '@/src/lib/popup-launch';
import { adapterForUrl, isSupportedChatUrl } from '@/src/platforms/detect';
import type { PlatformId } from '@/src/platforms/types';
import { getSavedSessions } from '@/src/lib/saved-sessions';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';

/** What the popup knows about the tab it was opened over. `pending` until the first tab query answers. */
type TabState = { status: 'pending' } | { status: 'other' } | { status: 'chat'; id: PlatformId; label: string };

function tabStateFor(url: string | undefined): TabState {
  if (!isSupportedChatUrl(url)) return { status: 'other' };
  const adapter = adapterForUrl(url);
  return adapter ? { status: 'chat', id: adapter.id, label: adapter.label } : { status: 'other' };
}

export default function App() {
  const [tab, setTab] = useState<TabState>({ status: 'pending' });
  const [sendError, setSendError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const launchInFlight = useRef(false);
  const [stemlmEnabled, setStemlmEnabled] = useState(stemlmEnabledFromBootCache);
  const [theme, setTheme] = useState<ResolvedTheme>(() => themeFromBootCache());
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [guideCopy, copyGuide] = useCopy();

  useLayoutEffect(() => {
    applyTheme(document.documentElement, theme);
    applyTheme(document.body, theme);
  }, [theme]);

  useEffect(() => {
    let live = true;
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      persistStemlmEnabledBoot(s.stemlmEnabled);
      setTheme(resolved);
      setStemlmEnabled(s.stemlmEnabled);
    });

    const refreshTab = () => {
      void getActiveTab().then((active) => {
        if (live) setTab(tabStateFor(active?.url));
      });
    };
    refreshTab();

    // The count is a nicety: it arrives after first paint and its absence is not an error.
    void getSavedSessions()
      .then((saved) => {
        if (live) setSavedCount(saved.length);
      })
      .catch(() => undefined);

    const onActivated = () => refreshTab();
    const onUpdated = (_id: number, info: { url?: string }) => {
      if (info.url) refreshTab();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    const stopToolbar = watchAndApplyToolbarIcon();
    const stopSettings = onSettingsChanged((s) => {
      setStemlmEnabled(s.stemlmEnabled);
      persistStemlmEnabledBoot(s.stemlmEnabled);
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      setTheme(resolved);
    });
    return () => {
      live = false;
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      stopToolbar();
      stopSettings();
    };
  }, []);

  async function toggleStemlm() {
    const next = !stemlmEnabled;
    setStemlmEnabled(next);
    persistStemlmEnabledBoot(next);
    setSendError(null);
    try {
      await writeStemlmEnabled(next);
    } catch {
      // The switch goes back to where it was, and says why: a silent flip reads as a glitch.
      setStemlmEnabled(!next);
      persistStemlmEnabledBoot(!next);
      setSendError(`Could not turn stemlm ${next ? 'on' : 'off'}. Try again.`);
    }
  }

  async function launchAndClose(run: () => Promise<LaunchResult>) {
    if (launchInFlight.current) return;
    launchInFlight.current = true;
    setLaunching(true);
    setSendError(null);
    try {
      const result = await run();
      if (result.ok) {
        window.close();
        return;
      }
      if ('error' in result && result.error) setSendError(result.error);
    } catch {
      setSendError('Could not finish this action. Please try again.');
    } finally {
      launchInFlight.current = false;
      setLaunching(false);
    }
  }

  const onChat = tab.status === 'chat';

  // The panel lives on a chat page. Anywhere else the button is not on offer, and the line under
  // it says where it is: nothing has to be pressed to find that out.
  const openPanel = (
    <div key="panel" className="slm-popup-primary">
      <button
        type="button"
        data-launch="open-study-panel"
        className={`slm-popup-open${onChat ? ' is-primary' : ''}`}
        disabled={launching || !onChat}
        aria-busy={launching}
        aria-describedby={tab.status === 'other' ? 'slm-popup-open-hint' : undefined}
        onClick={() => void launchAndClose(openStudyPanel)}
      >
        <IconPanel width={16} height={16} aria-hidden="true" />
        <span>Open study panel</span>
      </button>
      {tab.status === 'other' && (
        <p className="slm-popup-open-hint" id="slm-popup-open-hint">{unsupportedHostNotice()}</p>
      )}
      {sendError && <p className="slm-popup-error" role="alert">{sendError}</p>}
    </div>
  );

  const hosts = (
    <section key="hosts" className="slm-popup-hosts" aria-label="Open a supported chat">
      <p className="slm-popup-label">{onChat ? 'New chat' : 'Choose a chat'}</p>
      <div className="slm-popup-host-row">
        {CHAT_HOST_LAUNCH.map((host) => (
          <button
            key={host.id}
            type="button"
            data-host={host.id}
            className="slm-popup-host"
            title={`Open ${host.label}`}
            aria-label={host.label}
            disabled={launching}
            onClick={() => void launchAndClose(() => openChatHost(host.id))}
          >
            <span className="slm-popup-host-logo" aria-hidden="true">
              <HostLogo id={host.id} size={18} />
            </span>
            <span className="slm-popup-host-name">{host.label}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const rows = (
    <div key="rows" className="slm-popup-actions">
      <button
        type="button"
        role="switch"
        data-launch="stemlm-enabled"
        className={`slm-popup-row slm-popup-toggle${stemlmEnabled ? ' is-on' : ''}`}
        aria-checked={stemlmEnabled}
        aria-label={STEMLM_TOGGLE_LABEL}
        aria-describedby="slm-popup-toggle-hint"
        title={stemlmEnabled ? 'Turn stemlm off' : 'Turn stemlm on'}
        onClick={() => void toggleStemlm()}
      >
        <span className="slm-popup-row-title">{STEMLM_TOGGLE_LABEL}</span>
        <span className="slm-popup-switch" aria-hidden="true">
          <span className="slm-popup-switch-knob" />
        </span>
        <span className="slm-popup-row-hint" id="slm-popup-toggle-hint">
          {stemlmEnabled ? 'Turn off to hide the stemlm button in the chat box.' : 'The stemlm button is hidden in the chat box.'}
          {' '}The panel and your saved questions still work.
        </span>
      </button>
      <button
        type="button"
        data-launch="saved-questions"
        className="slm-popup-row slm-popup-link-row"
        disabled={launching}
        onClick={() => void launchAndClose(openSavedQuestionsLibrary)}
      >
        <span className="slm-popup-row-title">Saved questions</span>
        {savedCount != null && savedCount > 0 && (
          <span className="slm-popup-count" aria-label={`${savedCount} saved`}>{savedCount}</span>
        )}
        <IconChevronRight className="slm-popup-row-chevron" width={14} height={14} aria-hidden="true" />
      </button>
      {/* The manual way: the guide as text for any chat box, where stemlm cannot put it there itself. */}
      <button
        type="button"
        data-launch="copy-guide"
        className="slm-popup-row slm-popup-copy"
        data-state={guideCopy === 'idle' ? undefined : guideCopy}
        aria-describedby="slm-popup-guide-hint"
        onClick={() => void copyGuide(guideForPasting)}
      >
        <span className="slm-popup-row-title">
          {guideCopy === 'copied' ? 'Guide copied' : guideCopy === 'failed' ? 'Could not copy the guide' : 'Copy the guide'}
        </span>
        {guideCopy === 'copied'
          ? <IconCheck className="slm-popup-copy-icon" width={15} height={15} aria-hidden="true" />
          : <IconCopy className="slm-popup-copy-icon" width={15} height={15} aria-hidden="true" />}
        <span className="slm-popup-row-hint" id="slm-popup-guide-hint">
          For any other chat: paste it under your question, then paste the answer into the study panel.
        </span>
      </button>
      <span className="slm-sr-only" role="status" aria-live="polite">
        {guideCopy === 'copied' ? 'The stemlm guide is on the clipboard.' : guideCopy === 'failed' ? 'The guide could not be copied.' : ''}
      </span>
    </div>
  );

  // Off a chat there is nothing to open the panel on, so the way to a chat leads instead.
  const body: ReactNode[] = onChat ? [openPanel, rows, hosts] : [hosts, openPanel, rows];

  return (
    <div className="slm-popup" data-tab={tab.status}>
      <header className="slm-popup-head">
        <h1>
          <BrandWordmark variant={themeToBrandVariant(theme)} height={22} />
        </h1>
        <p className="slm-popup-status">
          {tab.status === 'chat' && (
            <>
              <HostLogo id={tab.id} size={13} />
              <span>Ready on {tab.label}</span>
            </>
          )}
          {tab.status === 'other' && (
            <>
              <span className="slm-popup-status-dot" aria-hidden="true" />
              <span>Open a chat to start</span>
            </>
          )}
        </p>
      </header>

      <div className="slm-popup-body">{body}</div>

      <footer className="slm-popup-foot">
        <button
          type="button"
          data-launch="welcome"
          className="slm-popup-help"
          disabled={launching}
          onClick={() => void launchAndClose(openWelcomePage)}
        >
          How to use stemlm
        </button>
        <button
          type="button"
          className="slm-popup-settings"
          data-launch="settings"
          aria-label="Settings"
          title="Settings"
          disabled={launching}
          onClick={() => void launchAndClose(openSettingsOverlay)}
        >
          <IconSettings width={15} height={15} aria-hidden="true" />
          <span aria-hidden="true">Settings</span>
        </button>
      </footer>
    </div>
  );
}
