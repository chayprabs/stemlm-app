import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Claude (claude.ai).
 * Composer is a ProseMirror contenteditable; assistant messages render with
 * the font-claude-message class / data-testid containing "message".
 */
const config: AdapterConfig = {
  id: 'claude',
  label: 'Claude',
  hosts: /(^|\.)claude\.ai$/i,
  editor: [
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'fieldset div[contenteditable="true"]',
  ],
  composerAnchor: [
    'button[aria-label*="Send" i]',
    'fieldset div[contenteditable="true"]',
    'div.flex.items-center > button[aria-label]',
  ],
  assistant: [
    '[data-testid="assistant-message"]',
    'div.font-claude-message',
    'div[data-is-streaming]',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    'div[data-is-streaming="true"]',
  ],
};

export const claudeAdapter = createAdapter(config);
export const claudeConfig = config;
