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
  composerBox: [
    'input-area-v2',
    '.input-area',
    'div.input-area-container',
    'div[class*="input-area"]:has(rich-textarea)',
    'rich-textarea',
  ],
  composerActionRow: [
    'div.send-button-container',
    'div[class*="input-buttons"]',
    'div[class*="trailing-actions"]',
    'button[aria-label*="Send" i]',
  ],
  composerAnchor: [
    'button[aria-label*="Send" i]',
    'div.send-button-container button',
    'div.send-button-container',
  ],
  composerShell: [
    'input-area',
    'div.input-area',
    'rich-textarea',
    'div[class*="input-container"]',
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
