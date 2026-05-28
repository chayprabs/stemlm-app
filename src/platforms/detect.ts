import type { PlatformAdapter, PlatformId } from './types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';

export const ADAPTERS: PlatformAdapter[] = [chatgptAdapter, claudeAdapter, geminiAdapter];

/** Return the adapter for the current host, or null on unsupported sites. */
export function detectAdapter(host: string = location.hostname): PlatformAdapter | null {
  return ADAPTERS.find((a) => a.matches(host)) ?? null;
}

export function adapterById(id: PlatformId): PlatformAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

export type { PlatformAdapter, PlatformId };
