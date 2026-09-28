import type { PanelHost } from '@/src/components/PanelHost';

export type PanelHostComponent = typeof PanelHost;

/**
 * The study panel, loaded on first open (PERF-03). The extension build replaces
 * this module with a loader for study-panel.js (scripts/panel-split.ts); tests
 * and tools get the plain dynamic import.
 */
export function loadPanelHost(): Promise<PanelHostComponent> {
  return import('@/src/components/PanelHost').then((mod) => mod.PanelHost);
}
