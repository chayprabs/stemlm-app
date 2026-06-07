/**
 * Normalize stemLM / model-authored math so KaTeX always receives proper delimiters.
 *
 * Models often emit raw LaTeX in @formula blocks (no $..$ / $$..$$), while @body
 * text usually mixes prose with $inline$ math. This module auto-wraps undelimited
 * LaTeX at render time without breaking markdown lists and tables.
 */
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';

const LATEX_COMMAND =
  /\\(?:frac|omega|Omega|quad|text|angle|sqrt|sum|int|begin|end|left|right|cdot|times|approx|neq|leq|geq|pm|mp|alpha|beta|gamma|theta|phi|mu|sigma|mathrm|mathbf|vec|overline|underline|hat|bar|tilde|parallel|perp|infty|partial|nabla|ldots|dots|sin|cos|tan|log|ln|exp|det|max|min|lim|sup|inf|operatorname|textbf|textit|ce|le|ge|ne|pm|mp|iff|implies|Leftrightarrow|Rightarrow|Leftrightarrow|therefore|because|boxed|cancel|overbrace|underbrace|binom|choose|atop)\b/;

const SUBSCRIPT = /[A-Za-z]_\{[^}]+\}|[A-Za-z]_[A-Za-z0-9]/;
const SUPERSCRIPT = /\^[^{}\s]|\^\{[^}]+\}/;
const DISPLAY_HINT = /\\begin\s*\{|\\\\|\\frac|\\sum|\\int|\\prod|\\lim|\\displaystyle/;

export type MathRenderMode = 'auto' | 'display';

/** Convert \(..\) / \[..\] to $..$ / $$..$$. */
export function normalizeMathDelimiters(src: string): string {
  return src
    .replace(/\\\[(.+?)\\\]/gs, (_m, inner: string) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, inner: string) => `$${inner}$`);
}

export function hasMathDelimiters(src: string): boolean {
  if (/\$\$[\s\S]+?\$\$/.test(src)) return true;
  return /(?:^|[^\\$])\$(?!\$)[^$\n]+?\$(?!\$)/m.test(src);
}

function isStructuralMarkdownLine(line: string): boolean {
  const t = line.trim();
  return (
    !t ||
    t.startsWith('```') ||
    /^#{1,6}\s/.test(t) ||
    /^\|.+\|/.test(t) ||
    /^-{3,}$/.test(t) ||
    /^\*{3,}$/.test(t)
  );
}

/** True when a line/paragraph is almost certainly raw LaTeX without $ delimiters. */
export function looksLikeRawLatex(text: string): boolean {
  const t = text.trim();
  if (!t || hasMathDelimiters(t) || isStructuralMarkdownLine(t)) return false;

  if (/\\begin\s*\{/.test(t)) return true;
  if (LATEX_COMMAND.test(t)) return true;
  if (SUBSCRIPT.test(t) && /[=+\-*/(),|]/.test(t)) return true;
  if (SUPERSCRIPT.test(t) && LATEX_COMMAND.test(t)) return true;
  if (/[A-Za-z]\s*\([^)]*\)\s*=/.test(t) && (LATEX_COMMAND.test(t) || SUBSCRIPT.test(t))) return true;
  if (/\\parallel|\\perp|\\angle\b/.test(t)) return true;
  if (/\|[^|]+\|/.test(t) && (/\\frac|[_^=]/.test(t) || SUBSCRIPT.test(t))) return true;
  if (/^[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9]+\s*=/.test(t) && (/\\|j\s*\\?omega|frac/i.test(t) || /[+\-]/.test(t))) {
    return true;
  }

  return false;
}

export function prefersDisplayMath(text: string): boolean {
  const t = text.trim();
  return (
    DISPLAY_HINT.test(t) ||
    t.includes('\\\\') ||
    (t.includes('\\quad') && t.includes(',')) ||
    t.includes('\n')
  );
}

function wrapAsMath(inner: string, display: boolean): string {
  const trimmed = inner.trim();
  if (!trimmed) return inner;
  return display ? `$$\n${trimmed}\n$$` : `$${trimmed}$`;
}

function wrapRawLatexLine(line: string, forceDisplay: boolean): string {
  const trimmed = line.trim();
  if (!trimmed || hasMathDelimiters(trimmed) || isStructuralMarkdownLine(line)) return line;

  if (!looksLikeRawLatex(trimmed)) {
    return wrapInlineRawLatexSegments(line);
  }

  const lead = line.match(/^\s*/)?.[0] ?? '';
  const display = forceDisplay || prefersDisplayMath(trimmed);
  return `${lead}${wrapAsMath(trimmed, display)}`;
}

/** Wrap undelimited LaTeX after list markers or colons within a prose line. */
function wrapInlineRawLatexSegments(line: string): string {
  const listMatch = /^(\s*[-*+]\s+)(.+)$/.exec(line);
  if (listMatch?.[1] && listMatch[2]) {
    const prefix = listMatch[1];
    const body = listMatch[2];
    if (hasMathDelimiters(body) || !looksLikeRawLatex(body)) return line;
    return `${prefix}${wrapAsMath(body, prefersDisplayMath(body))}`;
  }

  const colonMatch = /^(.+?:\s*)(.+)$/.exec(line.trim());
  if (colonMatch?.[1] && colonMatch[2]) {
    const head = colonMatch[1];
    const tail = colonMatch[2];
    if (!hasMathDelimiters(tail) && looksLikeRawLatex(tail)) {
      const lead = line.match(/^\s*/)?.[0] ?? '';
      return `${lead}${head}${wrapAsMath(tail, prefersDisplayMath(tail))}`;
    }
  }

  return line;
}

/**
 * Prepare capsule math for MathMarkdown / KaTeX.
 * @param mode — `display` for @formula blocks; `auto` for mixed prose.
 */
export function prepareMathForRender(content: string, mode: MathRenderMode = 'auto'): string {
  let src = stripProtocolMarkers(content);
  if (!src.trim()) return src;

  src = normalizeMathDelimiters(src);
  if (hasMathDelimiters(src)) return src;

  const forceDisplay = mode === 'display';

  if (looksLikeRawLatex(src)) {
    return wrapAsMath(src, forceDisplay || prefersDisplayMath(src) || !src.includes('\n'));
  }

  const lines = src.split('\n');
  const wrapped = lines.map((line) => wrapRawLatexLine(line, forceDisplay));
  if (wrapped.join('\n') !== src) return wrapped.join('\n');

  return src;
}
