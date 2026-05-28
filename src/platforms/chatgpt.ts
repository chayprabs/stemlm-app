import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * ChatGPT (chatgpt.com / chat.openai.com).
 * Composer is a ProseMirror contenteditable (#prompt-textarea); assistant
 * messages carry data-message-author-role="assistant".
 */
const config: AdapterConfig = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/i,
  editor: [
    '#prompt-textarea',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'textarea[data-id]',
    'form textarea',
  ],
  composerAnchor: [
    'form [data-testid="composer-trailing-actions"]',
    'form button[data-testid="send-button"]',
    'form button[aria-label*="Send" i]',
    'main form',
  ],
  assistant: [
    '[data-message-author-role="assistant"]',
    'div.agent-turn',
    'article[data-testid^="conversation-turn"]',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
  ],
};

export const chatgptAdapter = createAdapter(config);
export const chatgptConfig = config;
