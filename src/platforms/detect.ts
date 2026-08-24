import type { PlatformAdapter, PlatformId } from './types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import { grokAdapter } from './grok';
import { injectControlEnabled } from './routes';

/** Shipped chat adapters — ChatGPT, Claude, Gemini, Grok. */
export const ADAPTERS: PlatformAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
  grokAdapter,
];

export function detectAdapter(host: string = location.hostname): PlatformAdapter | null {
  return ADAPTERS.find((a) => a.matches(host)) ?? null;
}

export function adapterById(id: PlatformId): PlatformAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

/** Resolve a chatbot adapter from a full page URL using the shipped matchers. */
export function adapterForUrl(url: string | undefined | null): PlatformAdapter | null {
  if (!url) return null;
  try {
    return detectAdapter(new URL(url).hostname);
  } catch {
    return null;
  }
}

/**
 * Hostname is a shipped chat host AND the path is not a dedicated image-gen
 * surface (e.g. grok.com/imagine). SPA navigations re-check via injectControlEnabled.
 */
export function isSupportedChatUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const adapter = detectAdapter(parsed.hostname);
    if (!adapter) return false;
    return injectControlEnabled(adapter.id, parsed.pathname);
  } catch {
    return false;
  }
}

export { injectControlEnabled, isImageGenPath, watchComposerRoute } from './routes';

/** Host labels that actually work today — never advertise unshipped adapters. */
export function supportedChatLabels(): string[] {
  return ADAPTERS.map((adapter) => adapter.label);
}

export type { PlatformAdapter, PlatformId };
