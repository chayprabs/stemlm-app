import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { IconPanel, IconPower, IconSave, IconSettings } from '@/src/components/icons';
import { HostLogo } from '@/src/components/host-logos';
import { getActiveTab } from '@/src/lib/tab-bridge';
import {
  CHAT_HOST_LAUNCH,
  STEMLM_TOGGLE_LABEL,
  openChatHost,
  openSavedQuestionsLibrary,
  openSettingsOverlay,
  openStudyPanel,
  type LaunchResult,
} from '@/src/lib/popup-launch';
import { isSupportedChatUrl } from '@/src/platforms/detect';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';

export default function App() {
  const [supported, setSupported] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const launchInFlight = useRef(false);
  const [stemlmEnabled, setStemlmEnabled] = useState(stemlmEnabledFromBootCache);
  const [theme, setTheme] = useState<ResolvedTheme>(() => themeFromBootCache());

  useLayoutEffect(() => {
    applyTheme(document.documentElement, theme);
    applyTheme(document.body, theme);
  }, [theme]);

  useEffect(() => {
    getSettings().then((s) => {
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      persistStemlmEnabledBoot(s.stemlmEnabled);
      setTheme(resolved);
      setStemlmEnabled(s.stemlmEnabled);
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
    const stopSettings = onSettingsChanged((s) => {
      setStemlmEnabled(s.stemlmEnabled);
      persistStemlmEnabledBoot(s.stemlmEnabled);
      const resolved = resolveTheme(s.theme);
      persistThemeBoot(s.theme, resolved);
      setTheme(resolved);
    });
    return () => {
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
    try {
      await writeStemlmEnabled(next);
    } catch {
      setStemlmEnabled(!next);
      persistStemlmEnabledBoot(!next);
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

  return (
    <div className="slm-popup">
      <header className="slm-popup-head">
        <h1>
          <BrandWordmark variant={themeToBrandVariant(theme)} height={24} />
        </h1>
        <button
          type="button"
          className="slm-popup-settings"
          data-launch="settings"
          aria-label="Settings"
          title="Settings"
          disabled={launching}
          onClick={() => void launchAndClose(openSettingsOverlay)}
        >
          <IconSettings />
        </button>
      </header>

      <div className="slm-popup-actions">
        <button
          type="button"
          data-launch="open-study-panel"
          className="slm-popup-action is-primary"
          disabled={launching}
          aria-busy={launching}
          onClick={() => void launchAndClose(openStudyPanel)}
        >
          <span className="slm-popup-action-icon" aria-hidden="true">
            <IconPanel width={15} height={15} />
          </span>
          Open study panel
        </button>
        <button
          type="button"
          role="switch"
          data-launch="stemlm-enabled"
          className={`slm-popup-action slm-popup-toggle${stemlmEnabled ? ' is-on' : ''}`}
          aria-checked={stemlmEnabled}
          aria-label={STEMLM_TOGGLE_LABEL}
          title={stemlmEnabled ? 'Turn stemlm off' : 'Turn stemlm on'}
          onClick={() => void toggleStemlm()}
        >
          <span className="slm-popup-action-icon" aria-hidden="true">
            <IconPower width={15} height={15} />
          </span>
          <span className="slm-popup-toggle-copy">
            <span className="slm-popup-toggle-label">{STEMLM_TOGGLE_LABEL}</span>
          </span>
          <span className="slm-popup-switch" aria-hidden="true">
            <span className="slm-popup-switch-knob" />
          </span>
        </button>
        <button
          type="button"
          data-launch="saved-questions"
          className="slm-popup-action"
          disabled={launching}
          onClick={() => void launchAndClose(openSavedQuestionsLibrary)}
        >
          <span className="slm-popup-action-icon" aria-hidden="true">
            <IconSave width={15} height={15} />
          </span>
          Saved questions
        </button>
      </div>
      {sendError && <p className="slm-popup-error" role="alert">{sendError}</p>}

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
              disabled={launching}
              onClick={() => void launchAndClose(() => openChatHost(host.id))}
            >
              <span className="slm-popup-host-logo" aria-hidden="true">
                <HostLogo id={host.id} size={20} />
              </span>
              <span className="slm-popup-host-name">{host.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
