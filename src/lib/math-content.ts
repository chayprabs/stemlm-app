/**
 * Normalize stemLM / model-authored math so KaTeX always receives proper delimiters.
 *
 * Models often emit raw LaTeX in @formula blocks (no $..$ / $$..$$), while @body
 * text usually mixes prose with $inline$ math. This module auto-wraps undelimited
 * LaTeX at render time without breaking markdown lists and tables.
 */
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { dedupeComposerMath } from '@/src/lib/composer-text';

const LATEX_COMMAND =
  /\\(?:frac|omega|Omega|quad|text|angle|sqrt|sum|int|begin|end|left|right|cdot|times|approx|neq|leq|geq|pm|mp|alpha|beta|gamma|theta|phi|mu|sigma|mathrm|mathbf|vec|overline|underline|hat|bar|tilde|parallel|perp|infty|partial|nabla|ldots|dots|sin|cos|tan|log|ln|exp|det|max|min|lim|sup|inf|operatorname|textbf|textit|ce|le|ge|ne|iff|implies|Leftrightarrow|Rightarrow|therefore|because|boxed|cancel|overbrace|underbrace|binom|choose|atop|dfrac|tfrac|mkern)\b/;

const SUBSCRIPT = /[A-Za-z]_\{[^}]+\}|[A-Za-z]_[A-Za-z0-9]/;
const SUPERSCRIPT = /\^[^{}\s]|\^\{[^}]+\}/;
const DISPLAY_HINT = /\\begin\s*\{|\\\\|\\frac|\\sum|\\int|\\prod|\\lim|\\displaystyle/;
const BARE_SNIPPET_CMD = /\\(?:frac|dfrac|tfrac|sqrt|text|mathrm|mathbf)\b/;

/** Sentence openers common in @quickcheck / @body prose (not raw formulas). */
const PROSE_STARTERS =
  /^(?:Why|What|How|When|Where|Which|Who|Whose|Is|Are|Was|Were|Does|Do|Did|Can|Could|Should|Would|Will|Has|Have|Had|Because|Yes|No|Not|The|If|With|During|Since|So|This|That|These|Those|In|At|For|From|To|A|An)\b/i;

export type MathRenderMode = 'auto' | 'display';

type MathSegment = { math: boolean; text: string };

/** Convert \(..\) / \[..\] to $..$ / $$..$$. */
export function normalizeMathDelimiters(src: string): string {
  return src
    .replace(/\\\[(.+?)\\\]/gs, (_m, inner: string) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, inner: string) => `$${inner}$`);
}

/**
 * KaTeX parses \\par inside \\parallel as a paragraph break. Use \\mathbin{\\|}
 * instead — equivalent glyph, no fragile brace groups for remark-math.
 */
export function protectFragileLatexCommands(src: string): string {
  return src.replace(/\\parallel\b/g, '\\mathbin{\\|}');
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

function startsLikeMath(t: string): boolean {
  return /^[\\$([{A-Za-z0-9_^\-]/.test(t);
}

function readBracedArg(src: string, openBrace: number): string | null {
  if (src[openBrace] !== '{') return null;
  let depth = 0;
  for (let i = openBrace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(openBrace, i + 1);
    }
  }
  return null;
}

function extractLatexSnippet(src: string, start: number): string | null {
  const cmd = src.slice(start).match(/^\\[A-Za-z]+/)?.[0];
  if (!cmd) return null;
  let i = start + cmd.length;
  const args: string[] = [];
  while (i < src.length && src[i] === ' ') i++;
  for (let a = 0; a < 2; a++) {
    const arg = readBracedArg(src, i);
    if (!arg) break;
    args.push(arg);
    i += arg.length;
    while (i < src.length && src[i] === ' ') i++;
  }
  if (cmd === '\\sqrt' && args.length === 1) return cmd + args[0]!;
  if (args.length >= 1 && /^\\(?:frac|dfrac|tfrac|text|mathrm|mathbf)$/.test(cmd)) {
    return cmd + args.join('');
  }
  return null;
}

function countEnglishWords(text: string): number {
  const stripped = text
    .replace(/\\[A-Za-z]+(\{[^}]*\})?/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ')
    .replace(/[{}_^$\\&]/g, ' ');
  return (stripped.match(/\b[a-zA-Z]{3,}\b/g) ?? []).length;
}

/**
 * Natural-language sentences that mention symbols (e.g. V_C) must stay prose —
 * wrapping them in $..$ collapses spaces in KaTeX.
 */
export function looksLikeProseWithMath(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (PROSE_STARTERS.test(t)) return true;
  return countEnglishWords(t) >= 4;
}

/** True when a line/paragraph is almost certainly raw LaTeX without $ delimiters. */
export function looksLikeRawLatex(text: string): boolean {
  const t = text.trim();
  if (!t || hasMathDelimiters(t) || isStructuralMarkdownLine(t)) return false;
  if (looksLikeProseWithMath(t)) return false;
  if (!startsLikeMath(t)) return false;

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
  // Keep display math on one line so re-processing does not split $$ across lines.
  return display ? `$$${trimmed}$$` : `$${trimmed}$`;
}

function isAlreadyDelimitedMath(text: string): boolean {
  const t = text.trim();
  if (/^\$\$[\s\S]+\$\$$/.test(t)) return true;
  return /^\$[^$\n]+\$$/.test(t);
}

/** Split a line into math-delimited and plain-text runs. */
export function splitMathSegments(line: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let i = 0;

  while (i < line.length) {
    if (line.startsWith('$$', i)) {
      const end = line.indexOf('$$', i + 2);
      if (end !== -1) {
        segments.push({ math: true, text: line.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
    }

    if (line[i] === '$' && line[i + 1] !== '$') {
      const end = line.indexOf('$', i + 1);
      if (end !== -1) {
        segments.push({ math: true, text: line.slice(i, end + 1) });
        i = end + 1;
        continue;
      }
    }

    const next = line.indexOf('$', i);
    const end = next === -1 ? line.length : next;
    if (end === i) {
      // Treat stray delimiters as literal text so we always make progress.
      segments.push({ math: false, text: '$' });
      i += 1;
      continue;
    }
    segments.push({ math: false, text: line.slice(i, end) });
    // Stray/unclosed $ — advance by one to avoid infinite loop (i === end).
    i = end === i ? i + 1 : end;
  }

  return segments.length ? segments : [{ math: false, text: line }];
}

function wrapBareLatexSnippets(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const slice = text.slice(i);
    const m = BARE_SNIPPET_CMD.exec(slice);
    if (!m || m.index === undefined) {
      out += text.slice(i);
      break;
    }
    const start = i + m.index;
    out += text.slice(i, start);
    const snippet = extractLatexSnippet(text, start);
    if (snippet) {
      out += `$${snippet}$`;
      i = start + snippet.length;
    } else {
      out += m[0];
      i = start + m[0].length;
    }
  }
  return out;
}

function unwrapProseMathDelimiters(segment: string): string {
  const t = segment.trim();
  if (t.startsWith('$$') && t.endsWith('$$')) {
    const inner = t.slice(2, -2);
    return looksLikeProseWithMath(inner) ? inner : segment;
  }
  if (t.startsWith('$') && t.endsWith('$') && t.length > 2) {
    const inner = t.slice(1, -1);
    return looksLikeProseWithMath(inner) ? inner : segment;
  }
  return segment;
}

function wrapFragmentsInLine(line: string): string {
  if (isStructuralMarkdownLine(line) || !line.trim()) return line;

  if (isAlreadyDelimitedMath(line)) {
    const unwrapped = unwrapProseMathDelimiters(line.trim());
    if (unwrapped !== line.trim()) return wrapFragmentsInLine(unwrapped);
    return line;
  }

  if (!hasMathDelimiters(line)) {
    return wrapBareLatexSnippets(line);
  }

  return splitMathSegments(line)
    .map((seg) => {
      if (seg.math) {
        const unwrapped = unwrapProseMathDelimiters(seg.text);
        if (unwrapped !== seg.text) return wrapFragmentsInLine(unwrapped);
        return seg.text;
      }
      const trimmed = seg.text.trim();
      if (!trimmed) return seg.text;
      if (looksLikeRawLatex(trimmed)) {
        const lead = seg.text.match(/^\s*/)?.[0] ?? '';
        const trail = seg.text.match(/\s*$/)?.[0] ?? '';
        return `${lead}${wrapAsMath(trimmed, prefersDisplayMath(trimmed))}${trail}`;
      }
      return wrapBareLatexSnippets(seg.text);
    })
    .join('');
}

function wrapRawLatexLine(line: string, forceDisplay: boolean): string {
  const trimmed = line.trim();
  if (!trimmed || isStructuralMarkdownLine(line) || isAlreadyDelimitedMath(trimmed)) return line;
  if (trimmed === '$$') return line;

  let processed = line;
  if (!hasMathDelimiters(trimmed) && looksLikeRawLatex(trimmed)) {
    const lead = line.match(/^\s*/)?.[0] ?? '';
    const display = forceDisplay || prefersDisplayMath(trimmed);
    processed = `${lead}${wrapAsMath(trimmed, display)}`;
  }

  return wrapFragmentsInLine(processed);
}

/** Wrap undelimited LaTeX after list markers or colons within a prose line. */
function wrapInlineRawLatexSegments(line: string): string {
  const listMatch = /^(\s*[-*+]\s+)(.+)$/.exec(line);
  if (listMatch?.[1] && listMatch[2]) {
    const prefix = listMatch[1];
    const body = wrapFragmentsInLine(listMatch[2]);
    if (body === listMatch[2]) return line;
    return `${prefix}${body}`;
  }

  const colonMatch = /^(.+?:\s*)(.+)$/.exec(line.trim());
  if (colonMatch?.[1] && colonMatch[2]) {
    const head = colonMatch[1];
    const tail = wrapFragmentsInLine(colonMatch[2]);
    if (tail === colonMatch[2]) return line;
    const lead = line.match(/^\s*/)?.[0] ?? '';
    return `${lead}${head}${tail}`;
  }

  return line;
}

/**
 * Prepare capsule math for MathMarkdown / KaTeX.
 * @param mode — `display` for @formula blocks; `auto` for mixed prose.
 */
export function prepareMathForRender(content: string, mode: MathRenderMode = 'auto'): string {
  let src = dedupeComposerMath(stripProtocolMarkers(content));
  if (!src.trim()) return src;

  src = protectFragileLatexCommands(src);
  src = normalizeMathDelimiters(src);

  const forceDisplay = mode === 'display';
  const trimmed = src.trim();

  if (forceDisplay && !hasMathDelimiters(trimmed) && looksLikeRawLatex(trimmed) && !trimmed.includes('\n')) {
    return wrapAsMath(trimmed, true);
  }

  const lines = src.split('\n');
  return lines
    .map((line) => wrapInlineRawLatexSegments(wrapFragmentsInLine(wrapRawLatexLine(line, forceDisplay))))
    .join('\n');
}
