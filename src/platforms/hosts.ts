import type { PlatformId } from './types';

/**
 * Manifest / content-script match patterns for the four shipped chat hosts.
 * Include both apex and `*.` forms — Chrome does not treat `*.example.com`
 * as covering the bare domain, or vice versa.
 */
export const CHAT_CONTENT_MATCHES = [
  '*://chatgpt.com/*',
  '*://*.chatgpt.com/*',
  '*://chat.openai.com/*',
  '*://*.chat.openai.com/*',
  '*://claude.ai/*',
  '*://*.claude.ai/*',
  '*://gemini.google.com/*',
  '*://*.gemini.google.com/*',
  '*://grok.com/*',
  '*://*.grok.com/*',
] as const;

/** New-tab URLs for the four shipped chats (toolbar host buttons). */
export interface ChatHostLaunch {
  id: PlatformId;
  label: string;
  url: string;
}

export const CHAT_HOST_LAUNCH: readonly ChatHostLaunch[] = [
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'grok', label: 'Grok', url: 'https://grok.com/' },
];
