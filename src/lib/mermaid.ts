/**
 * Lazy mermaid loader. Mermaid is large, so it is imported on demand the first
 * time a mermaid diagram needs rendering. Theme is synced to the panel theme.
 */
import type { ResolvedTheme } from './theme';

type MermaidApi = typeof import('mermaid').default;

let mermaidPromise: Promise<MermaidApi> | null = null;
let currentTheme: ResolvedTheme | null = null;
let counter = 0;

function initializeMermaid(mermaid: MermaidApi, theme: ResolvedTheme): void {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  });
}

async function loadMermaid(theme: ResolvedTheme): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      const mermaid = m.default;
      initializeMermaid(mermaid, theme);
      currentTheme = theme;
      return mermaid;
    });
  }
  const mermaid = await mermaidPromise;
  if (currentTheme !== theme) {
    initializeMermaid(mermaid, theme);
    currentTheme = theme;
  }
  return mermaid;
}

/** Render mermaid source to an SVG string. Throws on invalid syntax. */
export async function renderMermaid(source: string, theme: ResolvedTheme): Promise<string> {
  const mermaid = await loadMermaid(theme);
  const id = `stemlm-mmd-${counter++}`;
  const { svg } = await mermaid.render(id, source.trim());
  return svg;
}
