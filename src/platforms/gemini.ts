import { createAdapter } from './factory';
import type { AdapterConfig } from './types';

/**
 * Gemini (gemini.google.com).
 * Composer is a Quill editor inside <rich-textarea>; the full stemLM protocol
 * is pasted inline into the chat box.
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
  composerLeading: [
    'button[aria-label*="Upload" i]',
    'button[aria-label*="Add" i]',
    'button[aria-label*="Attach" i]',
    'button[aria-label*="Insert" i]',
    'button[mattooltip*="Upload" i]',
    '.file-uploader-button',
    'uploader button',
    'button[aria-label*="Open upload" i]',
  ],
  composerShell: [
    'input-area-v2',
    'input-area',
    'div.input-area',
    'rich-textarea',
    'div[class*="input-container"]',
  ],
  assistant: [
    'model-response',
    'message-content.model-response-text',
    'message-content',
    'div.model-response-text',
    'div[class*="model-response"]',
    '[data-message-author-role="model"]',
  ],
  codeBlock: [
    'code-block pre code',
    'code-block pre',
    'code-block code',
    'code-block',
    'pre code',
    'pre',
  ],
  streaming: [
    'button[aria-label*="Stop" i]',
    '.stop-icon',
  ],
  brand: { accent: '#0EA5A0', accentFg: '#ffffff', neutral: true },
  layoutRoots: [
    'main',
    'chat-window',
    '#app-root',
    'infinite-scroller',
    '.conversation-container',
    'chat-app',
    'div[class*="conversation"]',
  ],
};

export const geminiAdapter = createAdapter(config);
export const geminiConfig = config;
