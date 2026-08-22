/**
 * Lazy mermaid loader. Mermaid is large, so it is imported on demand the first
 * time a mermaid diagram needs rendering. Theme is synced to the panel theme.
 */
import type { ResolvedTheme } from './theme';
import { FONT_SANS } from './fonts';

type MermaidApi = typeof import('mermaid').default;

let mermaidPromise: Promise<MermaidApi> | null = null;
let currentTheme: ResolvedTheme | null = null;
let counter = 0;

const MERMAID_RENDER_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function initializeMermaid(mermaid: MermaidApi, theme: ResolvedTheme): void {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: FONT_SANS,
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

function removeMermaidRenderNode(id: string): void {
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
}

/** Render mermaid source to an SVG string. Throws on invalid syntax or timeout. */
export async function renderMermaid(source: string, theme: ResolvedTheme): Promise<string> {
  const mermaid = await withTimeout(loadMermaid(theme), MERMAID_RENDER_TIMEOUT_MS, 'mermaid load');
  const id = `stemlm-mmd-${counter++}`;
  try {
    const { svg } = await withTimeout(
      mermaid.render(id, source.trim()),
      MERMAID_RENDER_TIMEOUT_MS,
      'mermaid render',
    );
    return svg;
  } finally {
    removeMermaidRenderNode(id);
  }
}
