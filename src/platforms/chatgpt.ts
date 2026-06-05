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
    'form div[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'textarea[data-id]',
    'form textarea',
  ],
  composerBox: [
    'form[data-type="unified-composer"]',
    'form:has(#prompt-textarea)',
    'form:has([data-testid="send-button"])',
    'main form:has(div.ProseMirror)',
    'div[class*="composer"]:has(#prompt-textarea)',
    'main form',
  ],
  composerActionRow: [
    '[data-testid="composer-trailing-actions"]',
    'div[data-testid="composer-footer-actions"]',
    'form [data-testid="composer-trailing-actions"]',
    'button[data-testid="send-button"]',
    'form .flex.items-end:has([data-testid="send-button"])',
  ],
  composerAnchor: [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send" i]',
    'button[data-testid="stop-button"]',
  ],
  composerShell: [
    'form[data-type="unified-composer"]',
    'div[class*="composer"]',
    'form.stretch',
    'main form',
  ],
  assistant: [
    '[data-message-author-role="assistant"]',
    'div.agent-turn',
    'div.markdown.prose',
    'article[data-testid^="conversation-turn"]',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
  ],
  // ChatGPT's UI is monochrome — match it rather than clash with purple.
  brand: { accent: '#10a37f', neutral: true },
  layoutRoots: ['main', 'div.flex.h-full.w-full', '#__next'],
};

export const chatgptAdapter = createAdapter(config);
export const chatgptConfig = config;
