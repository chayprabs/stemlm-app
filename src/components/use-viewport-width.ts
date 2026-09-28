import { useSyncExternalStore } from 'react';
import { viewportWidth } from '@/src/lib/split-ratio';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** Live viewport width, so split vs overlay follows a resized window (UI-SMALL-01). */
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, viewportWidth, viewportWidth);
}
