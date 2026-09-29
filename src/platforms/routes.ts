/**
 * Path gates for the inject control. Hostname matching still decides whether
 * a content script runs; these paths turn the control off on image-only SPA
 * surfaces (Grok Imagine, and any dedicated image-gen routes on other hosts).
 */
import type { PlatformId } from './types';

/** Dedicated image-generation (and other non-chat) pathnames per shipped host. Nested paths match. */
export const IMAGE_GEN_PATHS: Record<PlatformId, readonly RegExp[]> = {
  // ChatGPT Images reuses the chat composer; Codex is a separate coding product.
  chatgpt: [/^\/images(?:\/|$)/i, /^\/codex(?:\/|$)/i],
  grok: [/^\/imagine(?:\/|$)/i],
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
  window.addEventListener('popstate', notifyComposerRoute);
  window.addEventListener('hashchange', notifyComposerRoute);
  // A content script runs in an isolated world, so wrapping `history` here never
  // sees the page's own pushState/replaceState. The Navigation API object is
  // shared with the page and reports every same-document navigation.
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  if (navigation) {
    navigation.addEventListener('currententrychange', notifyComposerRoute);
    return;
  }
  // No Navigation API: wrapping still catches same-world calls.
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
}

/**
 * Subscribe to in-page SPA navigations (Navigation API, or pushState /
 * replaceState where it is missing, plus popstate / hashchange).
 * Used so the inject control hides on `/imagine` without a full reload.
 */
export function watchComposerRoute(listener: RouteListener): () => void {
  routeListeners.add(listener);
  ensureHistoryHook();
  return () => {
    routeListeners.delete(listener);
  };
}
