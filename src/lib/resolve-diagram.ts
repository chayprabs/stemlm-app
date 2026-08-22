/**
 * Shared diagram → sanitized SVG resolution for the panel and PDF export.
 *
 * Compile is theme-agnostic (spec / mermaid / hatch SVG). Theme is applied in
 * presentSvg so a light↔dark toggle never re-runs the compiler.
 */
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from './theme';
import { sanitizeSvg, extractSvg } from './sanitize';
import { renderMermaid } from './mermaid';
import type { DiagramSizeProfile } from './diagram-bounds';
import { presentSvg } from './svg-present';
import type { Overlay } from './figure/types';
import { canonicalizeDiagramType } from './figure/catalog';

export const DIAGRAM_COMPILE_TIMEOUT_MS = 12_000;
const MERMAID_TIMEOUT_MS = DIAGRAM_COMPILE_TIMEOUT_MS;

export interface ResolvedDiagramMarkup {
  svg: string;
  overlays: Overlay[];
}

/** Pre-theme sanitized SVG. Recolor with presentCompiledDiagram. */
export interface CompiledDiagram {
  svg: string;
  overlays: Overlay[];
  fromMermaid: boolean;
}

/** Strip fences / HTML-entity encoding so extractSvg can find markup. */
export function normalizeDiagramSource(content: string): string {
  let s = content.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:svg|xml)?[^\n]*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  }
  if (/&lt;svg/i.test(s)) {
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    s = ta.value;
  }
  return s;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('diagram render timeout')), ms);
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

function cleanSvg(svg: string, fromMermaid = false): string {
  return sanitizeSvg(extractSvg(svg), { preserveInlineStyles: fromMermaid });
}

const EMPTY_COMPILED: CompiledDiagram = { svg: '', overlays: [], fromMermaid: false };

/**
 * Compile a diagram to sanitized SVG without baking panel theme colors.
 * Mermaid always uses the light engine so a theme toggle does not re-render.
 */
export async function compileDiagram(
  diagram: Diagram,
  profile: DiagramSizeProfile = 'step',
): Promise<CompiledDiagram> {
  try {
    const type = canonicalizeDiagramType(diagram.type);
    if (type === 'svg') {
      return {
        svg: cleanSvg(normalizeDiagramSource(diagram.content)),
        overlays: [],
        fromMermaid: false,
      };
    }
    if (type === 'mermaid') {
      const rendered = await withTimeout(renderMermaid(diagram.content, 'light'), MERMAID_TIMEOUT_MS);
      return { svg: cleanSvg(rendered, true), overlays: [], fromMermaid: true };
    }
    const { compileDiagramSpec } = await import('./figure/compile');
    const result = await withTimeout(compileDiagramSpec(diagram, profile), DIAGRAM_COMPILE_TIMEOUT_MS);
    if (!result.ok) return EMPTY_COMPILED;
    return { svg: cleanSvg(result.svg), overlays: result.overlays, fromMermaid: false };
  } catch {
    return EMPTY_COMPILED;
  }
}

/** Apply theme colors to a previously compiled diagram. Sync — no spec/mermaid work. */
export function presentCompiledDiagram(
  compiled: CompiledDiagram,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
): ResolvedDiagramMarkup {
  if (!compiled.svg) return { svg: '', overlays: [] };
  const svg = presentSvg(compiled.svg, theme, profile);
  return { svg, overlays: svg ? compiled.overlays : [] };
}

/** Resolve a diagram to sanitized SVG + overlays, or empty svg on failure. */
export async function resolveDiagram(
  diagram: Diagram,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
): Promise<ResolvedDiagramMarkup> {
  const compiled = await compileDiagram(diagram, profile);
  return presentCompiledDiagram(compiled, theme, profile);
}

/** Resolve a diagram to sanitized SVG markup, or empty string on failure. */
export async function resolveDiagramSvg(
  diagram: Diagram,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
): Promise<string> {
  return (await resolveDiagram(diagram, theme, profile)).svg;
}
