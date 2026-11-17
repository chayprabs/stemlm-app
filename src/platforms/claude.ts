import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Claude (claude.ai).
 * The composer (seen 2026-11-17) is `[data-testid="chat-input"]`, a contenteditable in a card of
 * plain wrappers, with the attach button `[data-testid="chat-input-attach"]` in the row under it.
 * Earlier it was a ProseMirror field inside a fieldset; those selectors stay as fallbacks.
 * The attach button opens a menu: attach via the hidden file input, which appends to Claude's list.
 */
const config: AdapterConfig = {
  id: 'claude',
  label: 'Claude',
  hosts: /^(?:www\.)?claude\.ai$/i,
  additiveFileInput: true,
  fileInput: ['input[data-testid="file-upload"]', 'input[type="file"]'],
  editor: [
    '[data-testid="chat-input"][contenteditable="true"]',
    '[data-testid="chat-input"] [contenteditable="true"]',
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
    'button[data-testid="chat-input-send"]',
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[aria-label*="Send" i]',
    'fieldset button[type="submit"]',
  ],
  composerLeading: [
    'button[data-testid="chat-input-attach"]',
    'button[aria-label*="Add files" i]',
    'button[aria-label*="Open attachment" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Upload" i]',
    'button[aria-label*="Add file" i]',
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
  // Question lookup only; from open-source exporters, not a live page.
  userMessage: ['[data-testid="user-message"]'],
  brand: { accent: '#D97757', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', '[class*="chat"]', '[role="main"]'],
};

export const claudeAdapter = createAdapter(config);
