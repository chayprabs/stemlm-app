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

export type { PlatformAdapter, PlatformId };
