import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Claude (claude.ai).
 * Composer is a ProseMirror field inside a fieldset. The leading + / Attach
 * control opens a menu — attach via hidden file input / drop / paste.
 */
const config: AdapterConfig = {
  id: 'claude',
  label: 'Claude',
  hosts: /(^|\.)claude\.ai$/i,
  composerDock: 'before-plus',
  editor: [
    'fieldset div.ProseMirror[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"].ProseMirror',
    '[contenteditable="true"][role="textbox"]',
    'fieldset [contenteditable="true"]',
  ],
  composerBox: [
    'fieldset:has(.ProseMirror)',
    'fieldset:has([contenteditable="true"])',
    'form:has(.ProseMirror)',
    'fieldset',
  ],
  composerActionRow: [
    'fieldset button[aria-label*="Send" i]',
    'button[aria-label*="Send" i]',
  ],
  composerAnchor: [
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Send" i]',
    'fieldset button[type="submit"]',
  ],
  composerLeading: [
    'button[aria-label*="Open attachment" i]',
    'button[aria-label*="Attach file" i]',
    'button[aria-label*="Attach files" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Upload" i]',
    'button[aria-label*="Add file" i]',
    'fieldset button:first-of-type',
  ],
  composerShell: [
    'fieldset:has(.ProseMirror)',
    'fieldset:has([contenteditable="true"])',
    'form:has(.ProseMirror)',
    'fieldset',
  ],
  assistant: [
    '[data-testid="assistant-message"]',
    '[data-testid*="assistant-message" i]',
    '[data-is-streaming]',
    '[data-role="assistant"]',
    '.font-claude-message',
  ],
  codeBlock: ['pre code', 'pre', 'code'],
  streaming: [
    '[data-is-streaming="true"]',
    'button[aria-label*="Stop" i]',
  ],
  brand: { accent: '#D97757', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', '[class*="chat"]', '[role="main"]'],
};

export const claudeAdapter = createAdapter(config);
export const claudeConfig = config;
