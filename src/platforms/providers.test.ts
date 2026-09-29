import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADAPTERS, adapterById, adapterForUrl, detectAdapter, injectControlEnabled, isSupportedChatUrl, supportedChatLabels } from './detect';
import { CHAT_CONTENT_MATCHES, CHAT_HOST_LAUNCH } from './hosts';
import { PLATFORM_IDS, isPlatformId } from './types';

it('ships ChatGPT, Claude, Gemini and Grok through every entry point', () => {
  expect(ADAPTERS.map((adapter) => adapter.id)).toEqual(['chatgpt', 'claude', 'gemini', 'grok']);
  expect(PLATFORM_IDS).toEqual(['chatgpt', 'claude', 'gemini', 'grok']);
  expect(supportedChatLabels()).toEqual(['ChatGPT', 'Claude', 'Gemini', 'Grok']);
  expect(CHAT_HOST_LAUNCH.map((host) => host.id)).toEqual([...PLATFORM_IDS]);
  expect(adapterById('chatgpt')?.label).toBe('ChatGPT');
  for (const host of ['chatgpt.com', 'www.chatgpt.com']) {
    expect(detectAdapter(host)?.id).toBe('chatgpt');
    for (const route of ['/', '/c/example', '/g/g-example/c/example']) {
      expect(adapterForUrl(`https://${host}${route}`)?.id).toBe('chatgpt');
      expect(isSupportedChatUrl(`https://${host}${route}`)).toBe(true);
      expect(injectControlEnabled('chatgpt', route)).toBe(true);
    }
    for (const route of ['/images', '/codex']) {
      expect(isSupportedChatUrl(`https://${host}${route}`)).toBe(false);
    }
  }
  // chat.openai.com only redirects to chatgpt.com: no adapter, no page access.
  expect(detectAdapter('chat.openai.com')).toBeNull();
  expect(isPlatformId('chatgpt')).toBe(true);
});

it('grants ChatGPT HTTPS page access and shows its mark', () => {
  expect(CHAT_CONTENT_MATCHES).toContain('https://chatgpt.com/*');
  expect(CHAT_CONTENT_MATCHES.join('\n')).not.toMatch(/chat\.openai|http:/);
  const manifest = readFileSync('wxt.config.ts', 'utf8');
  for (const match of CHAT_CONTENT_MATCHES) expect(manifest).toContain(`'${match}'`);
  expect(readFileSync('src/components/host-logos.tsx', 'utf8')).toContain('M22.2819 9.8211');
  expect(readFileSync('README.md', 'utf8')).toMatch(/ChatGPT, Claude, Gemini, and Grok/);
});
