import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * ChatGPT (chatgpt.com; chat.openai.com only redirects there).
 * Composer is a ProseMirror field inside `form[data-chatgpt-composer]`; the
 * rounded pill switches between a single-line and a multiline layout as the
 * draft grows, so the inject control docks just outside the form (like Grok).
 * Never add a node inside the composer: logged-out ChatGPT takes over its
 * server-rendered DOM about 2 s after load and blanks the page when it meets
 * one. Without room beside the form the control floats in a gap made by CSS,
 * or above the form when even the + row has no spare width.
 * The leading + opens a menu. Attach via the hidden file input: its first
 * inputs only take images/video, so the guide goes to the one without `accept`,
 * which appends to ChatGPT's attachment list.
 * Logged out, ChatGPT serves `textarea#mobile-composer-prompt` (it cannot take
 * uploads, so stemlm reports that). `#prompt-textarea` and the data-testid
 * hooks are ChatGPT's earlier markup.
 */
const config: AdapterConfig = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: /^(?:www\.)?chatgpt\.com$/i,
  composerDock: 'outside-shell',
  insideDock: 'inset',
  fileInput: ['input[type="file"]:not([accept])'],
  additiveFileInput: true,
  editor: [
    'form[data-chatgpt-composer] div.ProseMirror[contenteditable="true"]',
    'form[data-chatgpt-composer] [contenteditable="true"][role="textbox"]',
    '#prompt-textarea',
    'textarea#mobile-composer-prompt',
  ],
  composerBox: [
    'form[data-chatgpt-composer]',
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
    'form[data-chatgpt-composer] button[data-composer-navigation-target="add-context"]',
    'form[data-chatgpt-composer] button[aria-label*="files and more" i]',
    'button[data-testid="composer-plus-btn"]',
    'button[aria-label*="files and more" i]',
  ],
  composerShell: [
    'form[data-chatgpt-composer]',
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
  brand: { accent: '#10A37F', accentFg: '#ffffff', neutral: true },
  // The app shell is sized by the viewport, so the split clamps it too; clamping `main` alone left
  // it starting after the sidebar rail and running under the panel.
  layoutRoots: ['main', '[data-app-shell-frame]', '[data-app-shell-workspace-row]', '[role="main"]'],
};

export const chatgptAdapter = createAdapter(config);
