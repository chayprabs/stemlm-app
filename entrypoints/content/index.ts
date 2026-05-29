import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import App from './App';
import './style.css';
import { detectAdapter } from '@/src/platforms/detect';
import { initController, getController } from '@/src/content/controller';
import { useStore } from '@/src/state/store';
import { getSettings, onSettingsChanged } from '@/src/lib/settings';
import { applyTheme, resolveTheme, watchSystemTheme } from '@/src/lib/theme';
import { trackEvent } from '@/src/lib/analytics';
import {
  loadMirroredSessions,
  mirrorActiveSessions,
  onMirroredSessionsChanged,
} from '@/src/lib/session-sync';

/**
 * stemLM content script. Mounts the overlay button + study panel inside an
 * isolated Shadow DOM (per-tab), detects the platform, and wires the
 * orchestration controller. Theme follows the user's system preference unless
 * overridden in settings. Sessions are per-tab unless "Share across tabs" is on.
 */
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
    '*://*.perplexity.ai/*',
    '*://grok.com/*',
    '*://*.grok.com/*',
    '*://chat.deepseek.com/*',
  ],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const adapter = detectAdapter();
    if (!adapter) return;

    const settings = await getSettings();
    if (!settings.enabledPlatforms[adapter.id]) return;

    const controller = initController(adapter);
    // Open the study panel only once the assistant actually starts answering
    // (not the moment we inject), so the panel never appears while the user is
    // still typing. Honour the user's auto-open preference.
    controller.setOnAnswerStarted(() => {
      if (useStore.getState().settings.autoOpenOnAnswer) {
        useStore.getState().openPanel();
        void trackEvent('panel_opened', { platform: adapter.id, source: 'answer' });
      }
    });

    useStore.getState().setSettings(settings);
    useStore.getState().setTheme(resolveTheme(settings.theme));
    useStore.getState().setSplitRatio(settings.splitRatio);

    if (settings.shareAcrossTabs) {
      const shared = await loadMirroredSessions();
      if (shared.length) useStore.getState().setSessions(shared);
    }

    let host: HTMLElement | null = null;

    const ui = await createShadowRootUi(ctx, {
      name: 'stemlm-root',
      position: 'inline',
      // Anchor to <html> (not <body>) so the panel is a sibling of <body>.
      // The split-screen shift transforms/shrinks <body>; keeping the panel
      // outside it lets the panel stay fixed to the viewport on the right.
      anchor: 'html',
      append: 'last',
      onMount(container) {
        host = container;
        applyTheme(container, useStore.getState().theme);
        const wrapper = document.createElement('div');
        wrapper.id = 'stemlm-app';
        container.append(wrapper);
        const root = createRoot(wrapper);
        root.render(createElement(App));
        return root;
      },
      onRemove(root: Root | undefined) {
        root?.unmount();
      },
    });

    ui.mount();

    let lastSessions = useStore.getState().sessions;
    useStore.subscribe((state) => {
      if (host) applyTheme(host, state.theme);
      if (state.settings.shareAcrossTabs && state.sessions !== lastSessions) {
        lastSessions = state.sessions;
        void mirrorActiveSessions(state.sessions);
      }
    });

    const stopMirrorWatch = onMirroredSessionsChanged((shared) => {
      if (useStore.getState().settings.shareAcrossTabs) {
        const current = useStore.getState();
        if (JSON.stringify(current.sessions) !== JSON.stringify(shared)) {
          useStore.setState({
            sessions: shared,
            activeSessionId: shared[shared.length - 1]?.id ?? current.activeSessionId,
          });
        }
      }
    });

    const stopSystemWatch = watchSystemTheme((theme) => {
      if (useStore.getState().settings.theme === 'auto') {
        useStore.getState().setTheme(theme);
      }
    });

    const stopSettingsWatch = onSettingsChanged((next) => {
      useStore.getState().setSettings(next);
      useStore.getState().setTheme(resolveTheme(next.theme));
      // Keep the split ratio in sync across tabs/sites (but don't fight an
      // in-progress drag — only adopt the stored value when it differs).
      if (Math.abs(useStore.getState().splitRatio - next.splitRatio) > 0.001) {
        useStore.getState().setSplitRatio(next.splitRatio);
      }
    });

    const onMessage = (msg: unknown) => {
      const type = typeof msg === 'object' && msg ? (msg as { type?: string }).type : undefined;
      if (type === 'stemlm:open-panel') {
        useStore.getState().openPanel();
        void trackEvent('panel_opened', { platform: adapter.id, source: 'toolbar' });
      } else if (type === 'stemlm:load-conversation') {
        getController()?.loadConversation();
        useStore.getState().openPanel();
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    ctx.onInvalidated(() => {
      stopSystemWatch();
      stopSettingsWatch();
      stopMirrorWatch();
      browser.runtime.onMessage.removeListener(onMessage);
      getController()?.stopWatching();
    });
  },
});
