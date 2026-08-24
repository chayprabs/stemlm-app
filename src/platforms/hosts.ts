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
