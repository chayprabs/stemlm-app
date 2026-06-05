import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Perplexity (perplexity.ai).
 * Composer is a textarea (or a Lexical contenteditable on newer builds);
 * answers render in a `.prose` block. Selectors are best-effort with multiple
 * fallbacks since Perplexity's markup changes often.
 */
const config: AdapterConfig = {
  id: 'perplexity',
  label: 'Perplexity',
  hosts: /(^|\.)perplexity\.ai$/i,
  editor: [
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ],
  composerBox: [
    'main form:has(textarea)',
    'div[class*="SearchBar"]',
    'div[class*="DesktopSearch"]',
    'div[class*="QueryBar"]',
    'main .rounded-2xl:has(textarea)',
    'main form',
  ],
  composerActionRow: [
    'div[class*="right"]:has(button[aria-label*="Submit" i])',
    'div.flex:has(button[type="submit"])',
    'button[aria-label*="Submit" i]',
    'button[data-testid="submit-button"]',
  ],
  composerAnchor: [
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Send" i]',
    'button[data-testid="submit-button"]',
    'button[type="submit"]',
  ],
  composerShell: [
    'div[class*="rounded"][class*="border"]',
    'form',
    'div[class*="input"]',
  ],
  assistant: [
    'div[id^="markdown-content"]',
    'div.prose',
    '[class*="answer"] .prose',
    '[class*="prose"]',
  ],
  codeBlock: ['pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    'button[aria-label*="Pause" i]',
  ],
  // Perplexity's signature teal.
  brand: { accent: '#20808d', accentFg: '#ffffff' },
  layoutRoots: ['main', '.main', '#__next'],
};

export const perplexityAdapter = createAdapter(config);
export const perplexityConfig = config;
