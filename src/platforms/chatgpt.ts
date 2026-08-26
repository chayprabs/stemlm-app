import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * ChatGPT (chatgpt.com, chat.openai.com).
 * Composer is `#prompt-textarea` (contenteditable ProseMirror, historically a
 * textarea). The leading + opens an attach menu — do not click it; attach via
 * the hidden file input / drop / paste, same as Gemini.
 *
 * The inject control docks just outside the visual pill. ChatGPT’s composer
 * uses a tight grid + overflow:hidden and React will strip unknown in-row
 * nodes, which is why an in-pill mount disappears.
 */
const config: AdapterConfig = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i,
  composerDock: 'outside-shell',
  editor: [
    '#prompt-textarea',
    '[data-testid="prompt-textarea"]',
    '#mobile-composer-prompt',
    'textarea#mobile-composer-prompt',
    'div#prompt-textarea[contenteditable="true"]',
    'div[contenteditable="true"][data-id="root"]',
    '[data-placeholder*="Ask anything" i]',
    '[placeholder*="Ask anything" i]',
    '[data-placeholder*="Ask ChatGPT" i]',
    '[placeholder*="Ask ChatGPT" i]',
    'textarea[placeholder*="Ask ChatGPT" i]',
    'textarea[aria-label*="Chat with ChatGPT" i]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    'form.wm-composer-composer [contenteditable="true"]',
    'form.wm-composer-composer textarea',
    'form:has([data-testid="composer-plus-btn"]) [contenteditable="true"]',
    'form:has([data-testid="send-button"]) [contenteditable="true"]',
    'form:has(#prompt-textarea) [contenteditable="true"]',
    'form:has(#mobile-composer-prompt) textarea',
  ],
  composerBox: [
    'form.wm-composer-composer',
    'form[data-landing]',
    'form:has(#mobile-composer-prompt)',
    'form:has(#prompt-textarea)',
    'form:has([data-testid="prompt-textarea"])',
    '[data-testid*="composer" i]:not(button)',
    'form:has([data-testid="composer-plus-btn"])',
    'form:has([data-testid="send-button"])',
  ],
  composerActionRow: [
    '[data-testid="composer-footer-actions"]',
    '[data-testid="send-button"]',
    'button[data-testid="send-button"]',
  ],
  composerAnchor: [
    'button[data-testid="send-button"]',
    '[data-testid="send-button"]',
    'button[aria-label*="Send prompt" i]',
    'button[aria-label*="Send" i]',
  ],
  composerLeading: [
    'button[data-testid="composer-plus-btn"]',
    '[data-testid="composer-plus-btn"]',
    'button[aria-label*="Add photos" i]',
    'button[aria-label*="Add files" i]',
    'button[aria-label*="Add file" i]',
    'button[aria-label*="files and more" i]',
    'button[aria-label*="photos & files" i]',
    'button[aria-label*="photos, files" i]',
    'button[aria-label*="Attach files" i]',
    'button[aria-label*="Attach photos" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Upload" i]',
    'button[aria-label*="composer menu" i]',
    'form button[aria-haspopup]:first-of-type',
    'form:has(#prompt-textarea) button:first-of-type',
    'form:has([data-testid="prompt-textarea"]) button:first-of-type',
  ],
  composerShell: [
    'form.wm-composer-composer',
    'form[data-landing]',
    'form:has(#mobile-composer-prompt)',
    'form div:has(#prompt-textarea):has(button)',
    'form:has(#prompt-textarea)',
    'form:has([data-testid="prompt-textarea"])',
    'form:has([data-testid="composer-plus-btn"])',
    'form:has([data-testid="send-button"])',
    'div:has(> #prompt-textarea)',
  ],
  assistant: [
    '[data-message-author-role="assistant"]',
    '[data-testid^="conversation-turn-"][data-turn="assistant"]',
    '[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"])',
  ],
  codeBlock: ['pre code', 'pre', 'code'],
  streaming: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop generating" i]',
    'button[aria-label*="Stop" i]',
  ],
  brand: { accent: '#10A37F', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', '#__next', '[role="main"]', '.composer-parent'],
};

export const chatgptAdapter = createAdapter(config);
export const chatgptConfig = config;
