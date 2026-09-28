import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { browser } from 'wxt/browser';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createElement } from 'react';
import App from './App';
import './style.css';
import { detectAdapter } from '@/src/platforms/detect';
import { CHAT_CONTENT_MATCHES } from '@/src/platforms/hosts';
import { initController, getController } from '@/src/content/controller';
import { restorableSessions } from '@/src/content/restored-sessions';
import { useStore } from '@/src/state/store';
import { getSettings, onSettingsChanged } from '@/src/lib/settings';
import { applyLiveSettings } from '@/src/lib/live-settings';
import { applyTheme, resolveTheme, watchSystemTheme } from '@/src/lib/theme';
import { watchAndApplyToolbarIcon } from '@/src/lib/toolbar-icon';
import { trackEvent } from '@/src/lib/analytics';
import {
  loadMirroredSessions,
  mergeMirroredSessions,
  mirrorActiveSessions,
  onMirroredSessionsChanged,
  sessionsMirrorFingerprint,
} from '@/src/lib/session-sync';
import { removeSplit } from '@/src/lib/split-screen';
import { installFontFaces } from '@/src/lib/fonts';
import { extensionAssetUrl } from '@/src/lib/extension-context';
import { removeComposerSlot } from '@/src/lib/composer-slot';
import { parseStemLmMessage } from '@/src/lib/messages';
import { consumePendingPanelAction, handleStemLmPanelMessage } from '@/src/lib/panel-remote';
import {
  getContentTabId,
  loadTabWorkspace,
  saveTabWorkspace,
  workspaceFromStore,
} from '@/src/lib/tab-workspace';

/** Optional browser services must not hold the provider UI hostage. */
async function withStartupDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Startup service timed out')), 5_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * stemLM content script. Mounts the overlay button + study panel inside an
 * isolated Shadow DOM (per-tab), detects the platform, and wires the
 * orchestration controller. Theme follows the user's system preference unless
 * overridden in settings. Sessions are per-tab unless "Share across tabs" is on.
 */
export default defineContentScript({
  matches: [...CHAT_CONTENT_MATCHES],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const adapter = detectAdapter();
    if (!adapter) return;

    let active = true;
    let phase: 'starting' | 'ready' | 'failed' = 'starting';
    let shadowHost: HTMLElement | undefined;
    let documentStyles: HTMLStyleElement[] = [];
    let host: HTMLElement | null = null;
    let tabId: number | undefined;
    let workspaceTimer: ReturnType<typeof setTimeout> | undefined;
    let workspaceDirty = false;
    let hydrating = false;
    let actionGeneration = 0;
    const cleanup: Array<() => void> = [];
    const startupUrl = location.href;

    // Keep the mounted React tree if the provider replaces document children.
    // Re-running ui.mount() would create a second tree and lose panel state.
    const reconnectHost = () => {
      if (!active || !shadowHost || !document.documentElement) return;
      if (!shadowHost.isConnected) document.documentElement.append(shadowHost);
      // WXT places font registrations outside the shadow root. Keep those too.
      for (const style of documentStyles) {
        if (!style.isConnected) (document.head ?? document.body)?.append(style);
      }
      rootObserver.observe(document.documentElement, { childList: true });
      if (document.head) rootObserver.observe(document.head, { childList: true });
    };
    const rootObserver = new MutationObserver(reconnectHost);
    const persistTabWorkspace = () => {
      if (!workspaceDirty || tabId == null) return;
      const state = useStore.getState();
      if (!state.sessions.length) return;
      workspaceDirty = false;
      void Promise.resolve(saveTabWorkspace(workspaceFromStore(tabId, state))).then((saved) => {
        if (saved !== false) return;
        workspaceDirty = true;
        if (active) useStore.getState().setStatus('error', 'Could not preserve this panel for reload. Your answer is still open; try saving it.');
      });
    };
    // Register before the first await: a reload can invalidate us during boot.
    ctx.onInvalidated(() => {
      active = false;
      phase = 'failed';
      rootObserver.disconnect();
      clearTimeout(workspaceTimer);
      try { persistTabWorkspace(); } catch { /* context may already be dead */ }
      for (const stop of cleanup) stop();
      removeSplit();
      removeComposerSlot();
      for (const style of documentStyles) if (style.hasAttribute('data-stemlm-fonts')) style.remove();
      getController()?.stopWatching();
      try {
        browser.runtime.onMessage.removeListener(onMessage);
      } catch { /* Extension context invalidated */ }
    });

    const onMessage = (
      msg: unknown,
      sender: { id?: string },
      sendResponse: (response?: unknown) => void,
    ) => {
      const parsed = parseStemLmMessage(msg, sender);
      if (!parsed) return false;

      reconnectHost();
      if (!active || phase !== 'ready' || !shadowHost?.isConnected) {
        sendResponse({
          ok: false,
          error: phase === 'starting' ? 'content-script-starting' : 'content-script-startup-failed',
        });
        return false;
      }
      if (parsed.type === 'stemlm:ask-here' || parsed.type === 'stemlm:load-conversation') actionGeneration++;
      void handleStemLmPanelMessage(parsed.type, adapter.id)
        .then(sendResponse)
        .catch(() => sendResponse({ ok: false }));
      return true;
    };
    browser.runtime.onMessage.addListener(onMessage);

    try {
      const settings = await getSettings();
      if (!active) return;
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
      useStore.setState({ view: settings.defaultView });

      const ui = await createShadowRootUi(ctx, {
        name: 'stemlm-root',
        position: 'inline',
        // Anchor to <html> (not <body>) so the panel is a sibling of <body>.
        // The split-screen shift transforms/shrinks <body>; keeping the panel
        // outside it lets the panel stay fixed to the viewport on the right.
        anchor: 'html',
        append: 'last',
        onMount(container, _shadow, mountedHost) {
          shadowHost = mountedHost;
          host = container;
          applyTheme(container, useStore.getState().theme);
          const wrapper = document.createElement('div');
          wrapper.id = 'stemlm-app';
          container.append(wrapper);
          const root = createRoot(wrapper);
          flushSync(() => root.render(createElement(App)));
          return root;
        },
        onRemove(root: Root | undefined) {
          root?.unmount();
        },
      });

      if (!active) return;
      const existingStyles = new Set(document.querySelectorAll('style[wxt-shadow-root-document-styles]'));
      ui.mount();
      documentStyles = [...document.querySelectorAll<HTMLStyleElement>('style[wxt-shadow-root-document-styles]')]
        .filter((style) => !existingStyles.has(style));
      // Plex + KaTeX faces from the extension: a shadow root ignores its own @font-face (D4).
      documentStyles.push(installFontFaces(document, extensionAssetUrl));
      rootObserver.observe(document, { childList: true });
      reconnectHost();
      phase = 'ready';

      cleanup.push(useStore.subscribe((state, previous) => {
        if (host) applyTheme(host, state.theme);
        if (hydrating) return;
        if (state.sessions !== previous.sessions || state.status !== previous.status ||
            state.buttonInjected !== previous.buttonInjected) actionGeneration++;
        if (state.settings.shareAcrossTabs && state.sessions !== previous.sessions) {
          void mirrorActiveSessions(state.sessions);
        }
        if (state.sessions !== previous.sessions || state.activeSessionId !== previous.activeSessionId ||
            state.activeStepIndex !== previous.activeStepIndex) {
          workspaceDirty = true;
          clearTimeout(workspaceTimer);
          if (tabId != null) workspaceTimer = setTimeout(persistTabWorkspace, 300);
        }
      }));

      const restoreError = (rejected?: number) => {
        useStore.getState().setStatus('error', `${rejected ? `Could not restore ${rejected} damaged session record(s). Healthy records remain available.` : 'Could not restore the previous study session.'} Your stored data is unchanged. Use Load conversation to recover answers from this chat.`);
      };
      cleanup.push(onMirroredSessionsChanged((shared) => {
        if (!useStore.getState().settings.shareAcrossTabs) return;
        try {
          const admitted = restorableSessions(shared);
          const current = useStore.getState();
          const merged = mergeMirroredSessions(current.sessions, admitted.sessions);
          if (sessionsMirrorFingerprint(merged) === sessionsMirrorFingerprint(current.sessions)) {
            if (admitted.rejected) restoreError(admitted.rejected);
            return;
          }

          const activeSessionId =
            merged.find((s) => s.id === current.activeSessionId)?.id ??
            merged[merged.length - 1]?.id ??
            current.activeSessionId;
          const activeSession = merged.find((s) => s.id === activeSessionId);
          const maxStep = Math.max(0, (activeSession?.capsule?.steps?.length ?? 1) - 1);
          const activeStepIndex = Math.max(0, Math.min(current.activeStepIndex, maxStep));

          hydrating = true;
          try {
            useStore.setState({ sessions: merged, activeSessionId, activeStepIndex });
            if (admitted.rejected) restoreError(admitted.rejected);
          } finally {
            hydrating = false;
          }
        } catch {
          restoreError();
        }
      }));

      cleanup.push(watchSystemTheme((theme) => {
        if (useStore.getState().settings.theme === 'auto') {
          useStore.getState().setTheme(theme);
        }
      }));
      cleanup.push(watchAndApplyToolbarIcon());

      let lastSettings = settings;
      cleanup.push(onSettingsChanged((next) => {
        const prev = lastSettings;
        lastSettings = next;
        applyLiveSettings(next, prev);
      }));

      // Restoration is optional and runs only after the entry points are usable.
      // A late browser response must not replace an answer the user just created.
      const initial = useStore.getState();
      const initialGeneration = actionGeneration;
      const startupStillCurrent = () => active && location.href === startupUrl &&
        actionGeneration === initialGeneration &&
        useStore.getState().buttonInjected === initial.buttonInjected;
      const canRestore = () => startupStillCurrent() &&
        useStore.getState().sessions === initial.sessions &&
        useStore.getState().status === initial.status &&
        useStore.getState().activeSessionId === initial.activeSessionId &&
        useStore.getState().activeStepIndex === initial.activeStepIndex &&
        useStore.getState().settings.shareAcrossTabs === settings.shareAcrossTabs;
      try {
        tabId = await withStartupDeadline(getContentTabId());
        if (!active) return;
        if (workspaceDirty && tabId != null) workspaceTimer = setTimeout(persistTabWorkspace, 300);
        if (canRestore()) {
          const [shared, backup] = await withStartupDeadline(Promise.all([
            settings.shareAcrossTabs ? loadMirroredSessions() : Promise.resolve([]),
            tabId != null ? loadTabWorkspace(tabId) : Promise.resolve(null),
          ]));
          if (canRestore()) {
            const sharedRecords = restorableSessions(shared);
            const backupRecords = restorableSessions(backup?.sessions ?? []);
            const rejected = sharedRecords.rejected + backupRecords.rejected;
            const sessions = settings.shareAcrossTabs && sharedRecords.sessions.length ? sharedRecords.sessions : backupRecords.sessions;
            if (sessions.length && initial.sessions.length === 0) {
              const activeSession = sessions.find((session) => session.id === backup?.activeSessionId) ?? sessions[sessions.length - 1]!;
              const maxStep = Math.max(0, activeSession.capsule.steps.length - 1);
              const cursor = backup?.activeStepIndex;
              const activeStepIndex = typeof cursor === 'number' && Number.isFinite(cursor)
                ? Math.max(0, Math.min(Math.trunc(cursor), maxStep)) : 0;
              hydrating = true;
              try {
                useStore.setState({ sessions, activeSessionId: activeSession.id, activeStepIndex, status: 'ready', errorMessage: undefined });
              } finally {
                hydrating = false;
              }
              if (settings.shareAcrossTabs && !sharedRecords.sessions.length && !rejected) void mirrorActiveSessions(sessions);
            }
            if (rejected) restoreError(rejected);
          }
        }
      } catch {
        if (canRestore()) restoreError();
      }
      if (!active) return;
      if (useStore.getState().sessions.length > 0) controller.startWatching();

      if (tabId != null && startupStillCurrent()) {
        try {
          await consumePendingPanelAction(tabId, adapter.id, startupStillCurrent, true);
        } catch {
          if (startupStillCurrent()) {
            useStore.getState().setStatus('error', 'Could not finish the requested action. Please try stemlm again.');
            useStore.getState().openPanel();
          }
        }
      }
    } catch {
      phase = 'failed';
    }
  },
});
