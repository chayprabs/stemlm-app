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

/**
 * stemLM content script. Mounts the overlay button + study panel inside an
 * isolated Shadow DOM (per-tab), detects the platform, and wires the
 * orchestration controller. Theme follows the user's system preference unless
 * overridden in settings.
 */
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
  ],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const adapter = detectAdapter();
    if (!adapter) return;

    const settings = await getSettings();
    if (!settings.enabledPlatforms[adapter.id]) return;

    initController(adapter);

    // Seed reactive state.
    useStore.getState().setSettings(settings);
    const initialTheme = resolveTheme(settings.theme);
    useStore.getState().setTheme(initialTheme);

    let host: HTMLElement | null = null;

    const ui = await createShadowRootUi(ctx, {
      name: 'stemlm-root',
      position: 'inline',
      anchor: 'body',
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

    // Keep the shadow host's theme attribute in sync with the store.
    useStore.subscribe((state) => {
      if (host) applyTheme(host, state.theme);
    });

    // Follow system theme changes while in "auto".
    const stopSystemWatch = watchSystemTheme((theme) => {
      if (useStore.getState().settings.theme === 'auto') {
        useStore.getState().setTheme(theme);
      }
    });

    // React to settings changes from the options page.
    const stopSettingsWatch = onSettingsChanged((next) => {
      useStore.getState().setSettings(next);
      useStore.getState().setTheme(resolveTheme(next.theme));
    });

    // Toolbar icon → open the panel (load mode handled by the empty state UI).
    const onMessage = (msg: unknown) => {
      if (typeof msg === 'object' && msg && (msg as { type?: string }).type === 'stemlm:open-panel') {
        useStore.getState().openPanel();
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    ctx.onInvalidated(() => {
      stopSystemWatch();
      stopSettingsWatch();
      browser.runtime.onMessage.removeListener(onMessage);
      getController()?.stopWatching();
    });
  },
});
