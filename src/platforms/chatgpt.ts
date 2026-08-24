import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * ChatGPT (chatgpt.com, chat.openai.com).
 * Composer is `#prompt-textarea` (contenteditable ProseMirror, historically a
 * textarea). The leading + opens an attach menu — do not click it; attach via
 * the hidden file input / drop / paste, same as Gemini.
 */
const config: AdapterConfig = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: /(^|\.)(chatgpt\.com|chat\.openai\.com)$/i,
  editor: [
    '#prompt-textarea',
    '[data-testid="prompt-textarea"]',
    'div#prompt-textarea[contenteditable="true"]',
    'div[contenteditable="true"][data-id="root"]',
    '[data-placeholder*="Ask anything" i]',
    '[placeholder*="Ask anything" i]',
    'form [contenteditable="true"]',
  ],
  composerBox: [
    'form:has(#prompt-textarea)',
    'form:has([data-testid="prompt-textarea"])',
    '[data-testid*="composer" i]',
    'form:has([data-testid="composer-plus-btn"])',
    'form:has([data-testid="send-button"])',
    'form',
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
    'button[aria-label*="Attach files" i]',
    'button[aria-label*="Attach photos" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Upload" i]',
    'form button[aria-haspopup]:first-of-type',
    'form:has(#prompt-textarea) button:first-of-type',
    'form:has([data-testid="prompt-textarea"]) button:first-of-type',
  ],
  composerShell: [
    'form:has(#prompt-textarea)',
    'form:has([data-testid="prompt-textarea"])',
    'form:has([data-testid="composer-plus-btn"])',
    'form:has([data-testid="send-button"])',
    'div:has(> #prompt-textarea)',
    'form',
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
