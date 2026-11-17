import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * ChatGPT (chatgpt.com; chat.openai.com only redirects there).
 * Signed in, the composer is a ProseMirror field: in `form[data-chatgpt-composer]` (seen
 * 2026-09-29) or as `#prompt-textarea` in `form[data-type="unified-composer"]`. Its pill switches
 * between a single-line and a multiline layout as the draft grows, which moves the + to another row.
 * Signed out (seen 2026-11-17) it is `textarea#mobile-composer-prompt` behind wrappers without a
 * box, with 44 px buttons, and a file is answered with a login wall: the guide goes into the
 * message as text there.
 * Never add a node inside the composer: logged-out ChatGPT takes over its server-rendered DOM
 * about 2 s after load and blanks the page when it meets one.
 * The leading + opens a menu. Attach via the hidden file input: its first inputs only take
 * images/video, so the guide goes to the one without `accept`, which appends to ChatGPT's list.
 */
const config: AdapterConfig = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: /^(?:www\.)?chatgpt\.com$/i,
  fileInput: ['input[type="file"]:not([accept])'],
  additiveFileInput: true,
  editor: [
    'form[data-chatgpt-composer] div.ProseMirror[contenteditable="true"]',
    'form[data-chatgpt-composer] [contenteditable="true"][role="textbox"]',
    '#prompt-textarea',
    'textarea#mobile-composer-prompt',
    'form[data-type="unified-composer"] [contenteditable="true"]',
  ],
  noFileEditor: ['textarea#mobile-composer-prompt'],
  composerBox: [
    'form[data-chatgpt-composer]',
    'form[data-type="unified-composer"]',
    'form:has(#prompt-textarea)',
    'form:has(#mobile-composer-prompt)',
  ],
  composerActionRow: [
    'form[data-chatgpt-composer] button[type="submit"]',
    '[data-testid="send-button"]',
  ],
  composerAnchor: [
    'form[data-chatgpt-composer] button[type="submit"]',
    'form[data-chatgpt-composer] button[aria-label*="Voice" i]',
    'button[data-testid="send-button"]',
  ],
  composerLeading: [
    'button[data-testid="composer-plus-btn"]',
    'button[data-composer-navigation-target="add-context"]',
    'button[aria-label*="files and more" i]',
  ],
  composerShell: [
    'form[data-chatgpt-composer]',
    'form[data-type="unified-composer"]',
    'form:has(#prompt-textarea)',
    'form:has(#mobile-composer-prompt)',
  ],
  assistant: [
    '[data-markdown-text-style="assistant-message"]',
    '[data-content-search-unit-key$=":assistant"]',
    '[data-message-author-role="assistant"]',
  ],
  // Code blocks render without <pre>: a header naming the language, then <code>.
  codeBlock: ['[data-markdown-copy="code-block"] code', 'pre code', 'code'],
  // Citations of the attached guide stay raw in code blocks, e.g. `:chatgpt-content-reference{index="0"}`.
  citationMarkers: [
    /[ \t]*:(?:chatgpt-content-reference\{[^}\n]*\}|contentReference\[[^\]\n]*\]\{[^}\n]*\})/g,
    /[ \t]*【[^】\n]*†[^】\n]*】/g,
  ],
  streaming: [
    'form[data-chatgpt-composer] button[aria-label="Stop"]',
    'button[data-testid="stop-button"]',
  ],
  // Question lookup only. The author-role hooks come from open-source exporters; the search-unit
  // key is the user-side twin of the assistant key above and has not been seen on a live page.
  userMessage: [
    '[data-message-author-role="user"]',
    '[data-message-role="user"]',
    '[data-content-search-unit-key$=":user"]',
  ],
  userMessageText: ['[data-user-message-bubble]', '.whitespace-pre-wrap'],
  brand: { accent: '#10A37F', accentFg: '#ffffff', neutral: true },
  // The app shell is sized by the viewport, so the split clamps it too; clamping `main` alone left
  // it starting after the sidebar rail and running under the panel.
  layoutRoots: ['main', '[data-app-shell-frame]', '[data-app-shell-workspace-row]', '[role="main"]'],
};

export const chatgptAdapter = createAdapter(config);
