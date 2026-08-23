import type { PlatformAdapter, PlatformId } from './types';
import { geminiAdapter } from './gemini';

/** Gemini-only. */
export const ADAPTERS: PlatformAdapter[] = [geminiAdapter];

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

export function isSupportedChatUrl(url: string | undefined | null): boolean {
  return adapterForUrl(url) != null;
}

/** Host labels that actually work today — never advertise unshipped adapters. */
export function supportedChatLabels(): string[] {
  return ADAPTERS.map((adapter) => adapter.label);
}

export type { PlatformAdapter, PlatformId };
