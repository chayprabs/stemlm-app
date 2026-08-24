import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Grok (grok.com only — not x.com/i/grok).
 * Landing page uses a textarea; threads often use a TipTap/ProseMirror editor.
 * Leading + sits next to the input and opens an attach menu.
 */
const config: AdapterConfig = {
  id: 'grok',
  label: 'Grok',
  hosts: /(^|\.)grok\.com$/i,
  editor: [
    'textarea[aria-label*="Ask Grok" i]',
    'textarea[placeholder*="Ask Grok" i]',
    'textarea[placeholder*="How can I help" i]',
    'textarea[aria-label*="How can I help" i]',
    '.tiptap.ProseMirror[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    'form textarea',
    'textarea',
  ],
  composerBox: [
    'form:has(textarea[aria-label*="Ask Grok" i])',
    'form:has(.ProseMirror)',
    '[class*="chat-input"]',
    '[class*="composer"]',
    'form:has(textarea)',
  ],
  composerActionRow: [
    '[class*="chat-input-actions"]',
    '[class*="input-actions"]',
    'button[aria-label="Submit"]',
  ],
  composerAnchor: [
    'button[aria-label="Submit"]',
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Send" i]',
  ],
  composerLeading: [
    'button[aria-label*="Upload" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Add file" i]',
    'button[aria-label*="Add files" i]',
    'button[aria-label*="Add photos" i]',
    'button[aria-label="+"]',
    'form[class*="chat-input"] button:first-of-type',
    '[class*="chat-input"] button:first-of-type',
    'form:has(textarea) button:first-of-type',
    'form button:first-of-type',
  ],
  composerShell: [
    'form:has(textarea[aria-label*="Ask Grok" i])',
    'form:has(.ProseMirror)',
    'form:has(textarea)',
    '[class*="chat-input"]',
  ],
  assistant: [
    '[data-testid="grok-message"]',
    '[data-testid*="assistant" i]',
    '.message-bubble',
    '[class*="message-bubble"]',
    '[data-role="assistant"]',
  ],
  codeBlock: ['pre code', 'pre', 'code'],
  streaming: [
    'button[aria-label*="Stop" i]',
    'button[aria-label*="Stop generating" i]',
  ],
  brand: { accent: '#000000', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', '#__next', '[role="main"]'],
};

export const grokAdapter = createAdapter(config);
export const grokConfig = config;
