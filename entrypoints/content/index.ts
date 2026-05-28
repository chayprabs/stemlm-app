import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import App from './App';
import './style.css';

/**
 * stemLM content script.
 *
 * Mounts the overlay button + study panel inside an isolated Shadow DOM so the
 * host page's CSS can never break our UI (and vice-versa). Runs per-tab, giving
 * us natural per-tab isolation. The actual orchestration (button anchoring,
 * prompt injection, answer capture) is wired in later milestones; this sets up
 * the mount surface.
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
    const ui = await createShadowRootUi(ctx, {
      name: 'stemlm-root',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        // Host element carries the theme attribute so our CSS vars resolve.
        container.setAttribute('data-stemlm-theme', 'light');
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
  },
});
