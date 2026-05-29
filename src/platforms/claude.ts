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
    'div[contenteditable="true"]',
  ],
  composerAnchor: [
    'button[aria-label*="Send" i]',
    'button[data-testid="send-button"]',
    'fieldset button[type="submit"]',
    'fieldset div[contenteditable="true"]',
  ],
  assistant: [
    '[data-testid="assistant-message"]',
    'div.font-claude-message',
    'div.font-claude-response',
    'div[data-is-streaming]',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    'div[data-is-streaming="true"]',
  ],
  // Claude's signature warm coral on cream.
  brand: { accent: '#d97757', accentFg: '#ffffff' },
  layoutRoots: ['div.flex.min-h-screen', 'main', '#__next'],
};

export const claudeAdapter = createAdapter(config);
export const claudeConfig = config;
