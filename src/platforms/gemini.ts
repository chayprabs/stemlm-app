import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Gemini (gemini.google.com).
 * Composer is a Quill editor (div.ql-editor) inside <rich-textarea>; assistant
 * responses render inside <model-response> / <message-content> elements and
 * code in <code-block> custom elements.
 */
const config: AdapterConfig = {
  id: 'gemini',
  label: 'Gemini',
  hosts: /(^|\.)gemini\.google\.com$/i,
  editor: [
    'rich-textarea div.ql-editor[contenteditable="true"]',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  composerAnchor: [
    'button[aria-label*="Send" i]',
    'div.send-button-container',
    'rich-textarea',
  ],
  assistant: [
    'model-response',
    'message-content.model-response-text',
    'div.model-response-text',
  ],
  codeBlock: ['code-block pre code', 'code-block pre', 'pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    '.stop-icon',
  ],
  // Google / Gemini blue→violet.
  brand: { accent: '#4285f4', accentFg: '#ffffff' },
  layoutRoots: ['main', 'chat-window', '#app-root'],
};

export const geminiAdapter = createAdapter(config);
export const geminiConfig = config;
