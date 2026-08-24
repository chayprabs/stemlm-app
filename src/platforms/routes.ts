/**
 * Path gates for the inject control. Hostname matching still decides whether
 * a content script runs; these paths turn the control off on image-only SPA
 * surfaces (Grok Imagine, and any dedicated image-gen routes on other hosts).
 */
import type { PlatformId } from './types';

/** Dedicated image-generation pathnames per shipped host. Nested paths match. */
export const IMAGE_GEN_PATHS: Record<PlatformId, readonly RegExp[]> = {
  grok: [/^\/imagine(?:\/|$)/i],
  chatgpt: [/^\/images(?:\/|$)/i, /^\/sora(?:\/|$)/i],
  gemini: [/^\/imagen(?:\/|$)/i, /^\/image(?:s|gen)?(?:\/|$)/i],
  claude: [/^\/imagine(?:\/|$)/i],
};

export function isImageGenPath(id: PlatformId, pathname: string): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return IMAGE_GEN_PATHS[id].some((re) => re.test(path));
}

/** True when the inject control should mount on this host + pathname. */
export function injectControlEnabled(id: PlatformId, pathname: string): boolean {
  return !isImageGenPath(id, pathname);
}

type RouteListener = () => void;
const routeListeners = new Set<RouteListener>();
let historyHooked = false;
let origPush: History['pushState'] | undefined;
let origReplace: History['replaceState'] | undefined;

function notifyComposerRoute() {
  for (const listener of routeListeners) {
    try {
      listener();
    } catch {
      /* listener errors must not break navigation */
    }
  }
}

function ensureHistoryHook() {
  if (historyHooked) return;
  if (typeof history === 'undefined' || typeof window === 'undefined') return;
  historyHooked = true;
  origPush = history.pushState.bind(history);
  origReplace = history.replaceState.bind(history);
  history.pushState = ((...args: Parameters<History['pushState']>) => {
    const ret = origPush!(...args);
    notifyComposerRoute();
    return ret;
  }) as History['pushState'];
  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    const ret = origReplace!(...args);
    notifyComposerRoute();
    return ret;
  }) as History['replaceState'];
  window.addEventListener('popstate', notifyComposerRoute);
  window.addEventListener('hashchange', notifyComposerRoute);
}

/**
 * Subscribe to in-page SPA navigations (pushState / replaceState / popstate).
 * Used so the inject control hides on `/imagine` without a full reload.
 */
export function watchComposerRoute(listener: RouteListener): () => void {
  routeListeners.add(listener);
  ensureHistoryHook();
  return () => {
    routeListeners.delete(listener);
  };
}
