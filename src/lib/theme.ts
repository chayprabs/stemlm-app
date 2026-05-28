/**
 * Theme resolution. The default ("auto") follows the user's system preference
 * via prefers-color-scheme; explicit light/dark override it.
 */
export type ThemePref = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemPrefersDark() ? 'dark' : 'light';
}

/** Set the data-stemlm-theme attribute on a host element (drives CSS vars). */
export function applyTheme(host: HTMLElement, theme: ResolvedTheme): void {
  host.setAttribute('data-stemlm-theme', theme);
  host.style.colorScheme = theme;
}

/**
 * Watch the system color scheme. Returns an unsubscribe fn. Only fires while
 * the preference is "auto" (the caller passes the current pref getter).
 */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  let mql: MediaQueryList;
  try {
    mql = window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return () => {};
  }
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
