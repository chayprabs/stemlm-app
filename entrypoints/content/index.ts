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
  mergeMirroredSessions,
  mirrorActiveSessions,
  onMirroredSessionsChanged,
  sessionsMirrorFingerprint,
} from '@/src/lib/session-sync';
import { removeSplit } from '@/src/lib/split-screen';
import { removeComposerSlot } from '@/src/lib/composer-slot';
import { parseStemLmMessage } from '@/src/lib/messages';
import { handleStemLmPanelMessage } from '@/src/lib/panel-remote';
import {
  getContentTabId,
  loadTabWorkspace,
  saveTabWorkspace,
  takePendingPanelAction,
  workspaceFromStore,
} from '@/src/lib/tab-workspace';

/**
 * stemLM content script. Mounts the overlay button + study panel inside an
 * isolated Shadow DOM (per-tab), detects the platform, and wires the
 * orchestration controller. Theme follows the user's system preference unless
 * overridden in settings. Sessions are per-tab unless "Share across tabs" is on.
 */
export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const adapter = detectAdapter();
    if (!adapter) return;

    const settings = await getSettings();
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

    const tabId = await getContentTabId();

    if (settings.shareAcrossTabs) {
      const shared = await loadMirroredSessions();
      if (shared.length) useStore.getState().setSessions(shared);
    } else if (tabId != null) {
      const backup = await loadTabWorkspace(tabId);
      if (backup?.sessions.length && useStore.getState().sessions.length === 0) {
        const sessions = backup.sessions;
        const activeSessionId =
          backup.activeSessionId ?? sessions[sessions.length - 1]?.id;
        const activeSession =
          sessions.find((s) => s.id === activeSessionId) ?? sessions[sessions.length - 1];
        const maxStep = Math.max(0, (activeSession?.capsule.steps.length ?? 1) - 1);
        const activeStepIndex = Math.max(
          0,
          Math.min(backup.activeStepIndex ?? 0, maxStep),
        );
        useStore.setState({
          sessions,
          activeSessionId,
          activeStepIndex,
          status: 'ready',
        });
      }
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
    let workspaceTimer: ReturnType<typeof setTimeout> | null = null;
    const persistTabWorkspace = () => {
      if (tabId == null) return;
      const state = useStore.getState();
      if (!state.sessions.length) return;
      void saveTabWorkspace(workspaceFromStore(tabId, state));
    };

    useStore.subscribe((state) => {
      if (host) applyTheme(host, state.theme);
      if (state.settings.shareAcrossTabs && state.sessions !== lastSessions) {
        lastSessions = state.sessions;
        void mirrorActiveSessions(state.sessions);
      }
      if (tabId != null && state.sessions.length) {
        if (workspaceTimer) clearTimeout(workspaceTimer);
        workspaceTimer = setTimeout(persistTabWorkspace, 300);
      }
    });

    const stopMirrorWatch = onMirroredSessionsChanged((shared) => {
      if (!useStore.getState().settings.shareAcrossTabs) return;
      const current = useStore.getState();
      const merged = mergeMirroredSessions(current.sessions, shared);
      if (sessionsMirrorFingerprint(merged) === sessionsMirrorFingerprint(current.sessions)) return;

      const activeSessionId =
        merged.find((s) => s.id === current.activeSessionId)?.id ??
        merged[merged.length - 1]?.id ??
        current.activeSessionId;
      const activeSession = merged.find((s) => s.id === activeSessionId);
      const maxStep = Math.max(0, (activeSession?.capsule?.steps?.length ?? 1) - 1);
      const activeStepIndex = Math.max(0, Math.min(current.activeStepIndex, maxStep));

      useStore.setState({
        sessions: merged,
        activeSessionId,
        activeStepIndex,
      });
    });

    const stopSystemWatch = watchSystemTheme((theme) => {
      if (useStore.getState().settings.theme === 'auto') {
        useStore.getState().setTheme(theme);
      }
    });

    let lastSettings = settings;
    const stopSettingsWatch = onSettingsChanged((next) => {
      const prev = lastSettings;
      lastSettings = next;

      useStore.getState().setSettings(next);
      useStore.getState().setTheme(resolveTheme(next.theme));

      const state = useStore.getState();
      if (
        !state.splitDragging &&
        Math.abs(state.splitRatio - next.splitRatio) > 0.001
      ) {
        state.setSplitRatio(next.splitRatio);
      }

      if (next.shareAcrossTabs && !prev.shareAcrossTabs) {
        if (state.sessions.length) {
          void mirrorActiveSessions(state.sessions);
        } else {
          void loadMirroredSessions().then((shared) => {
            if (shared.length) useStore.getState().setSessions(shared);
          });
        }
      } else if (!next.shareAcrossTabs && prev.shareAcrossTabs) {
        void mirrorActiveSessions([]);
      }
    });

    const onMessage = (
      msg: unknown,
      sender: { id?: string },
      sendResponse: (response?: unknown) => void,
    ) => {
      const parsed = parseStemLmMessage(msg, sender);
      if (!parsed) return false;

      void handleStemLmPanelMessage(parsed.type, adapter.id).then(sendResponse);
      return true;
    };
    browser.runtime.onMessage.addListener(onMessage);

    if (tabId != null) {
      const pending = await takePendingPanelAction(tabId);
      if (pending) await handleStemLmPanelMessage(pending, adapter.id);
    }

    ctx.onInvalidated(() => {
      persistTabWorkspace();
      if (workspaceTimer) clearTimeout(workspaceTimer);
      removeSplit();
      removeComposerSlot();
      getController()?.stopWatching();
      stopSystemWatch();
      stopSettingsWatch();
      stopMirrorWatch();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
