/**
 * Shared diagram → sanitized SVG resolution for the panel and PDF export.
 *
 * Compile is theme-agnostic (spec / hatch SVG). Theme is applied in
 * presentSvg so a light↔dark toggle never re-runs the compiler.
 */
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from './theme';
import { sanitizeSvg, extractSvg } from './sanitize';
import type { DiagramSizeProfile } from './diagram-bounds';
import { presentSvg } from './svg-present';
import type { CompileFailCode, Overlay } from './figure/types';
import { canonicalizeDiagramType } from './figure/catalog';
import { compileDiagramSpec } from './figure/compile';
import { svgMarkupHasGraphicShapes } from './mount-svg';
import { renderOverlayHtml } from './figure/overlay';
import { parseSpec } from './figure/spec';
import { validateSfdSemantics } from './figure/leftovers/sfd';
import { repairDiagram } from './figure/intel/repair';
import { translateForeignDiagram } from './figure/intel/foreign';

export const DIAGRAM_COMPILE_TIMEOUT_MS = 12_000;

export interface DiagramDiagnostic {
  family: string;
  stage: 'compile' | 'sanitize' | 'presentation';
  code: CompileFailCode;
  reason: string;
}

interface DiagramMarkup {
  svg: string;
  overlays: Overlay[];
  /**
   * The spec only compiled after its notation was corrected (src/lib/figure/intel/repair.ts).
   * The figure says so, because the student should know the drawing is not the model's text verbatim.
   */
  corrected?: boolean;
}

export type ResolvedDiagramMarkup = DiagramMarkup & (
  | { ok: true }
  | { ok: false; diagnostic: DiagramDiagnostic }
);

/** Pre-theme sanitized SVG. Recolor with presentCompiledDiagram. */
export type CompiledDiagram = ResolvedDiagramMarkup;

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

class DiagramTimeout extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new DiagramTimeout('diagram render timeout')), ms);
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

function cleanSvg(svg: string): string {
  if (svg.length > 2_000_000) return '';
  return sanitizeSvg(extractSvg(svg));
}

function hidden(diagnostic: DiagramDiagnostic): CompiledDiagram {
  return { ok: false, svg: '', overlays: [], diagnostic };
}

function admitSvg(family: string, source: string, overlays: Overlay[]): CompiledDiagram {
  const svg = cleanSvg(source);
  if (!svg || !svgMarkupHasGraphicShapes(svg)) {
    return hidden({ family, stage: 'sanitize', code: 'malformed', reason: 'no usable graphic remains after sanitizing' });
  }
  for (const overlay of overlays) {
    if (![overlay.x, overlay.y, overlay.width, overlay.height].every(Number.isFinite) ||
      overlay.width < 0 || overlay.height < 0) {
      return hidden({ family, stage: 'presentation', code: 'malformed', reason: `invalid figure label ${overlay.id}` });
    }
    try {
      renderOverlayHtml(overlay, true);
    } catch {
      return hidden({ family, stage: 'presentation', code: 'malformed', reason: `invalid figure label ${overlay.id}` });
    }
  }
  return { ok: true, svg, overlays };
}

/**
 * Compile a diagram to sanitized SVG without baking panel theme colors.
 *
 * The spec is compiled exactly as written first, so a correct spec is never touched. Only when
 * that fails:
 * 1. a notation the model brought from elsewhere (Mermaid, Graphviz DOT, a Markdown pipe table, an
 *    arrow list) is translated whole into a native spec (src/lib/figure/intel/foreign), which
 *    refuses rather than draw a construct the native grammar cannot say;
 * 2. otherwise the spec's own notation is repaired (spelling, separators, wrappers: never content).
 * Either result goes through the same strict compiler; one that still does not compile is
 * discarded and the original failure stands.
 */
export async function compileDiagram(
  diagram: Diagram,
  profile: DiagramSizeProfile = 'step',
): Promise<CompiledDiagram> {
  const strict = await compileDiagramStrict(diagram, profile);
  if (strict.ok) return strict;
  const foreign = translateForeignDiagram(diagram);
  if (foreign) {
    const translated = await compileDiagramStrict(foreign.diagram, profile);
    if (translated.ok) return { ...translated, corrected: true };
    const mended = await compileRepaired(foreign.diagram, profile);
    if (mended) return mended;
  }
  return (await compileRepaired(diagram, profile)) ?? strict;
}

/** The diagram with its notation repaired, compiled strictly; null when nothing was repaired or it still fails. */
async function compileRepaired(diagram: Diagram, profile: DiagramSizeProfile): Promise<CompiledDiagram | null> {
  const { diagram: repaired, repairs } = repairDiagram(diagram);
  if (!repairs.length) return null;
  const compiled = await compileDiagramStrict(repaired, profile);
  return compiled.ok ? { ...compiled, corrected: true } : null;
}

/** Compile the spec exactly as written: no notation repair. The repair tests measure against this. */
export async function compileDiagramStrict(
  diagram: Diagram,
  profile: DiagramSizeProfile = 'step',
): Promise<CompiledDiagram> {
  const type = canonicalizeDiagramType(diagram.type);
  try {
    if (type === 'svg') {
      return admitSvg(type, normalizeDiagramSource(diagram.content), []);
    }
    if (type === 'mermaid') {
      // Mermaid is no longer rendered (flowcharts and state machines compile as
      // type=graph); an answer saved with one keeps it hidden, like any failed figure.
      return hidden({ family: type, stage: 'compile', code: 'refused', reason: 'mermaid diagrams are not rendered; use type=graph' });
    }
    const result = await withTimeout(compileDiagramSpec(diagram, profile), DIAGRAM_COMPILE_TIMEOUT_MS);
    if (!result.ok) return hidden({ family: type, stage: 'compile', code: result.code, reason: result.reason });
    if (type === 'sfd') {
      const reason = validateSfdSemantics(parseSpec(type, diagram.content));
      if (reason) return hidden({ family: type, stage: 'compile', code: 'malformed', reason });
    }
    return admitSvg(type, result.svg, result.overlays);
  } catch (error) {
    return hidden({ family: type, stage: 'compile', code: error instanceof DiagramTimeout ? 'timeout' : 'throw', reason: error instanceof Error ? error.message : 'diagram compilation failed' });
  }
}

/** Apply theme colors to a previously compiled diagram. Sync — no compiler work. */
export function presentCompiledDiagram(
  compiled: CompiledDiagram,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
  displayScale = 1,
): ResolvedDiagramMarkup {
  if (!compiled.ok) return compiled;
  try {
    const svg = presentSvg(compiled.svg, theme, profile, displayScale);
    if (svg && svgMarkupHasGraphicShapes(svg)) {
      return { ok: true, svg, overlays: compiled.overlays, ...(compiled.corrected ? { corrected: true } : {}) };
    }
  } catch {
    // A presentation failure must not discard the surrounding answer or report.
  }
  return hidden({ family: 'presentation', stage: 'presentation', code: 'malformed', reason: 'figure cannot be presented safely' });
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
