/**
 * Shared diagram → sanitized SVG resolution for the panel and PDF export.
 */
import type { Diagram } from '@/src/protocol/types';
import type { ResolvedTheme } from './theme';
import { sanitizeSvg, extractSvg } from './sanitize';
import { renderMermaid } from './mermaid';
import type { DiagramSizeProfile } from './diagram-bounds';
import { presentSvg } from './svg-present';

const MERMAID_TIMEOUT_MS = 12_000;

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

function finalizeSvg(
  svg: string,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile,
  fromMermaid = false,
): string {
  const clean = sanitizeSvg(extractSvg(svg), { preserveInlineStyles: fromMermaid });
  return clean ? presentSvg(clean, theme, profile) : '';
}

/** Resolve a diagram to sanitized SVG markup, or empty string on failure. */
export async function resolveDiagramSvg(
  diagram: Diagram,
  theme: ResolvedTheme,
  profile: DiagramSizeProfile = 'step',
): Promise<string> {
  try {
    if (diagram.type === 'svg') {
      return finalizeSvg(normalizeDiagramSource(diagram.content), theme, profile);
    }
    const rendered = await withTimeout(renderMermaid(diagram.content, theme), MERMAID_TIMEOUT_MS);
    return finalizeSvg(rendered, theme, profile, true);
  } catch {
    return '';
  }
}
