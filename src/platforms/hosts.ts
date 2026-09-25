import type { PlatformId } from './types';

/**
 * Manifest / content-script match patterns for the three shipped chat hosts.
 * Include both apex and `*.` forms — Chrome does not treat `*.example.com`
 * as covering the bare domain, or vice versa.
 * All shipped matches are HTTPS-only because this extension never needs HTTP
 * pages.
 */
export const CHAT_CONTENT_MATCHES = [
  'https://claude.ai/*',
  'https://www.claude.ai/*',
  'https://gemini.google.com/*',
  'https://www.gemini.google.com/*',
  'https://grok.com/*',
  'https://www.grok.com/*',
] as const;

/** New-tab URLs for the three shipped chats (toolbar host buttons). */
export interface ChatHostLaunch {
  id: PlatformId;
  label: string;
  url: string;
}

export const CHAT_HOST_LAUNCH: readonly ChatHostLaunch[] = [
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app' },
  { id: 'grok', label: 'Grok', url: 'https://grok.com/' },
];
