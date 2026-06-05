import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * DeepSeek (chat.deepseek.com).
 * Composer is a textarea (#chat-input); answers render in `.ds-markdown`.
 */
const config: AdapterConfig = {
  id: 'deepseek',
  label: 'DeepSeek',
  hosts: /(^|\.)deepseek\.com$/i,
  editor: [
    'textarea#chat-input',
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]',
  ],
  composerBox: [
    'div:has(textarea#chat-input)',
    'div[class*="chat-input"]',
    'main form:has(#chat-input)',
    'div.f6d670cb',
    'main .border:has(textarea)',
  ],
  composerActionRow: [
    'div:has(div[role="button"][aria-disabled])',
    'div.flex:has(div[role="button"])',
    'div[role="button"][aria-disabled]',
    'button[type="submit"]',
  ],
  composerAnchor: [
    'div[role="button"][aria-disabled]',
    'button[type="submit"]',
    'button[aria-label*="Send" i]',
  ],
  composerShell: [
    'div[class*="input-box"]',
    'div[class*="chat-input"]',
    'form',
  ],
  assistant: [
    'div.ds-markdown',
    '[class*="ds-markdown"]',
    '[class*="markdown"]',
  ],
  codeBlock: ['pre code', 'pre', 'div.md-code-block pre'],
  streaming: [
    'div[role="button"][aria-label*="Stop" i]',
    'button[aria-label*="Stop" i]',
    '[class*="stop"]',
  ],
  // DeepSeek blue.
  brand: { accent: '#4d6bfe', accentFg: '#ffffff' },
  layoutRoots: ['main', '#root', '.c3ecdb38'],
};

export const deepseekAdapter = createAdapter(config);
export const deepseekConfig = config;
