import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADAPTERS, adapterById, adapterForUrl, detectAdapter, injectControlEnabled, isSupportedChatUrl, supportedChatLabels } from './detect';
import { CHAT_CONTENT_MATCHES, CHAT_HOST_LAUNCH } from './hosts';
import { PLATFORM_IDS, isPlatformId } from './types';

it('ships exactly Claude, Gemini and Grok and rejects every former ChatGPT entry point', () => {
  expect(ADAPTERS.map((adapter) => adapter.id)).toEqual(['claude', 'gemini', 'grok']);
  expect(PLATFORM_IDS).toEqual(['claude', 'gemini', 'grok']);
  expect(supportedChatLabels()).toEqual(['Claude', 'Gemini', 'Grok']);
  expect(CHAT_HOST_LAUNCH.map((host) => host.id)).toEqual(['claude', 'gemini', 'grok']);
  expect(adapterById('chatgpt')).toBeUndefined();
  for (const host of ['chatgpt.com', 'www.chatgpt.com', 'chat.openai.com', 'www.chat.openai.com']) {
    expect(detectAdapter(host)).toBeNull();
    for (const route of ['/', '/c/example', '/images', '/sora/new']) {
      expect(adapterForUrl(`https://${host}${route}`)).toBeNull();
      expect(isSupportedChatUrl(`https://${host}${route}`)).toBe(false);
      expect(injectControlEnabled('chatgpt', route)).toBe(false);
    }
  }
  // Retirement must not invalidate previously saved study records.
  expect(isPlatformId('chatgpt')).toBe(true);
});

it('removes ChatGPT content injection, permissions and public branding', () => {
  expect(CHAT_CONTENT_MATCHES.join('\n')).not.toMatch(/chatgpt|chat\.openai/);
  for (const path of ['wxt.config.ts', 'src/components/host-logos.tsx', 'README.md']) {
    expect(readFileSync(path, 'utf8')).not.toMatch(/ChatGPT|chatgpt\.com|chat\.openai\.com|ChatGptLogo|M22\.2819 9\.8211/);
  }
});
