import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Grok (grok.com).
 * Composer is a textarea; answers render in message bubbles. Monochrome brand
 * to match Grok/X's black-and-white UI.
 */
const config: AdapterConfig = {
  id: 'grok',
  label: 'Grok',
  hosts: /(^|\.)grok\.com$/i,
  editor: [
    'textarea[aria-label*="Ask" i]',
    'textarea',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ],
  composerAnchor: [
    'button[type="submit"]',
    'button[aria-label*="Send" i]',
    'button[aria-label*="Submit" i]',
  ],
  assistant: [
    'div.message-bubble',
    '[class*="response-content"]',
    '[class*="message"] .prose',
    'div.prose',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    'button[aria-label*="Cancel" i]',
  ],
  // Grok / X monochrome.
  brand: { accent: '#111111', neutral: true },
  layoutRoots: ['main', '#root', '#__next'],
};

export const grokAdapter = createAdapter(config);
export const grokConfig = config;
