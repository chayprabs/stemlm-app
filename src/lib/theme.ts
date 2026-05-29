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

/**
 * Detect the host page's effective light/dark scheme by sampling the first
 * opaque background colour up the DOM from <body>. Used so the overlay button
 * adapts to whichever site the user is on (e.g. ChatGPT dark vs Gemini light),
 * independent of the panel's own theme. Falls back to the system preference.
 */
export function detectHostScheme(): ResolvedTheme {
  try {
    let el: HTMLElement | null = document.body;
    let lum: number | null = null;
    for (let hops = 0; el && hops < 6; hops++, el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      const parsed = parseColor(bg);
      if (parsed && parsed.a > 0.1) {
        lum = relativeLuminance(parsed.r, parsed.g, parsed.b);
        break;
      }
    }
    if (lum === null) return systemPrefersDark() ? 'dark' : 'light';
    return lum < 0.5 ? 'dark' : 'light';
  } catch {
    return systemPrefersDark() ? 'dark' : 'light';
  }
}

function parseColor(c: string): { r: number; g: number; b: number; a: number } | null {
  const m = /rgba?\(([^)]+)\)/i.exec(c);
  if (!m) return null;
  const parts = (m[1] ?? '').split(',').map((s) => parseFloat(s.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { r: parts[0]!, g: parts[1]!, b: parts[2]!, a: parts[3] ?? 1 };
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
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
