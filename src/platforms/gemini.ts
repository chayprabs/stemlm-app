import { createAdapter } from './factory';
import type { AdapterConfig, PlatformAdapter } from './types';
import type { InjectionPayload } from '@/src/protocol/builder';
import { PROTOCOL_FILENAME } from '@/src/protocol/builder';
import { attachTextFile } from '@/src/lib/file-inject';

/**
 * Gemini (gemini.google.com).
 * Composer is a Quill editor inside <rich-textarea>; protocol is attached as
 * stemlm-protocol.txt via the host file-upload pipeline (not pasted inline).
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
    'div.model-response-text',
  ],
  codeBlock: ['code-block pre code', 'code-block pre', 'pre code', 'pre'],
  streaming: [
    'button[aria-label*="Stop" i]',
    '.stop-icon',
  ],
  brand: { accent: '#0EA5A0', accentFg: '#ffffff', neutral: true },
  layoutRoots: ['main', 'chat-window', '#app-root'],
};

const GEMINI_FILE_INPUT = [
  'images-files-uploader input[type="file"]',
  'input-area-v2 input[type="file"]',
  'input-area input[type="file"]',
  'rich-textarea input[type="file"]',
  'input[type="file"]',
];

const GEMINI_UPLOAD_BTN = [
  'button[aria-label*="Upload" i]',
  'button[aria-label*="Add" i]',
  'button[aria-label*="Attach" i]',
  'button[aria-label*="Insert" i]',
  'button[mattooltip*="Upload" i]',
  '.file-uploader-button',
  'uploader button',
];

const GEMINI_ATTACHMENT = [
  'images-files-uploader [class*="preview"]',
  'images-files-uploader [class*="chip"]',
  'images-files-uploader [class*="attachment"]',
  'images-files-uploader img',
  '[class*="file-preview"]',
  'uploader-file-preview',
];

const base = createAdapter(config);

async function attachProtocolFile(fileContent: string): Promise<boolean> {
  const result = await attachTextFile(fileContent, {
    filename: PROTOCOL_FILENAME,
    fileInputSelectors: GEMINI_FILE_INPUT,
    uploadButtonSelectors: GEMINI_UPLOAD_BTN,
    attachmentSelectors: GEMINI_ATTACHMENT,
    dropTargets: ['rich-textarea', 'input-area-v2', 'input-area', '.input-area', 'div.ql-editor'],
    waitMs: 3000,
    timeoutMs: 5000,
  });
  return result.ok;
}

export const geminiAdapter: PlatformAdapter = {
  ...base,

  async injectWithProtocolFile(payload: InjectionPayload) {
    const attached = await attachProtocolFile(payload.fileContent);
    if (!attached) {
      return { ok: false, method: 'file' };
    }

    // Brief pause so Gemini finishes processing the upload before we rewrite the editor.
    await new Promise((r) => setTimeout(r, 200));
    const textOk = base.insertPrompt(payload.composerText);
    return { ok: textOk, method: 'file' };
  },
};

export const geminiConfig = config;
