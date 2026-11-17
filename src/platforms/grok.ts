import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Grok (grok.com only — not x.com/i/grok).
 * The composer (seen 2026-11-17) is a contenteditable inside `[data-testid="chat-input"]`, with
 * `[data-testid="attach-button"]` leading its form. Earlier the landing page used a textarea and
 * threads a TipTap/ProseMirror editor; those selectors stay as fallbacks.
 * Signed out, Grok answers an upload with "Sign in to upload files".
 */
const config: AdapterConfig = {
  id: 'grok',
  label: 'Grok',
  hosts: /^(?:www\.)?grok\.com$/i,
  editor: [
    '[data-testid="chat-input"] [contenteditable="true"]',
    '[data-testid="chat-input"][contenteditable="true"]',
    '[data-testid="chat-input"] textarea',
    'textarea[placeholder*="What do you want to know" i]',
    'textarea[aria-label*="Ask Grok" i]',
    'textarea[placeholder*="Ask Grok" i]',
    'textarea[placeholder*="How can I help" i]',
    'textarea[aria-label*="How can I help" i]',
    '.tiptap.ProseMirror[contenteditable="true"]',
    'div.ProseMirror[contenteditable="true"]',
    'form:has([class*="chat-input"]) textarea',
    '[class*="chat-input"] textarea',
    'form textarea',
  ],
  composerBox: [
    'form:has([data-testid="chat-input"])',
    'form:has(textarea[placeholder*="What do you want to know" i])',
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
    'button[data-testid="chat-submit"]',
    'button[aria-label="Submit"]',
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Send" i]',
  ],
  composerLeading: [
    'button[data-testid="attach-button"]',
    'button[aria-label*="Add files" i]',
    'button[aria-label*="Upload" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Add attachment" i]',
    'button[aria-label*="Add file" i]',
    'button[aria-label*="Add photos" i]',
    'button[aria-label="+"]',
  ],
  composerShell: [
    'form:has([data-testid="chat-input"])',
    'form:has(textarea[placeholder*="What do you want to know" i])',
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
  // Question lookup only; from open-source exporters, not a live page.
  userMessage: ['.message-bubble[data-testid="user-message"]', '[data-testid="user-message"]'],
  userMessageText: ['.response-content-markdown'],
  brand: { accent: '#000000', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', '#__next', '[role="main"]'],
};

export const grokAdapter = createAdapter(config);
