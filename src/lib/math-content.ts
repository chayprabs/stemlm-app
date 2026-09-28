/**
 * Normalize stemLM / model-authored math so KaTeX always receives proper delimiters.
 *
 * Models often emit raw LaTeX in @formula blocks (no $..$ / $$..$$), while @body
 * text usually mixes prose with $inline$ math. This module auto-wraps undelimited
 * LaTeX at render time without breaking markdown lists and tables.
 *
 * Display mode treats the whole payload as one equation (so `A(t) = …` is not
 * mistaken for the English article "A"). Auto mode wraps STEM tokens / short
 * expressions and leaves English sentences intact.
 */
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { dedupeComposerMath } from '@/src/lib/composer-text';

const LATEX_COMMAND =
  /\\(?:frac|omega|Omega|quad|text|angle|sqrt|sum|int|begin|end|left|right|cdot|times|approx|neq|leq|geq|pm|mp|alpha|beta|gamma|theta|phi|mu|sigma|mathrm|mathbf|vec|overline|underline|hat|bar|tilde|parallel|perp|infty|partial|nabla|ldots|dots|sin|cos|tan|log|ln|exp|det|max|min|lim|sup|inf|operatorname|textbf|textit|ce|le|ge|ne|iff|implies|Leftrightarrow|Rightarrow|therefore|because|boxed|cancel|overbrace|underbrace|binom|choose|atop|dfrac|tfrac|mkern)\b/;

const SUBSCRIPT = /[A-Za-z]_\{[^}]+\}|[A-Za-z]_[A-Za-z0-9]/;
const SUPERSCRIPT = /\^[^{}\s]|\^\{[^}]+\}/;
const DISPLAY_HINT = /\\begin\s*\{|\\\\|\\frac|\\sum|\\int|\\prod|\\lim|\\displaystyle/;

const SINGLE_ARG_SNIPPET_CMD =
  /^\\(?:sqrt|text|mathrm|mathbf|mathit|mathsf|mathbb|mathcal|vec|hat|bar|tilde|overline|underline|operatorname|boxed|cancel|overbrace|underbrace|dot|ddot|check|grave|acute|boldsymbol|ce)$/;
const TWO_ARG_SNIPPET_CMD = /^\\(?:frac|dfrac|tfrac|binom|overset|underset)$/;

const ZERO_ARG_NAMES = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta',
  'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho',
  'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi',
  'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
  'Phi', 'Psi', 'Omega', 'infty', 'partial', 'nabla', 'ell', 'hbar', 'cdot',
  'times', 'approx', 'neq', 'leq', 'geq', 'pm', 'mp', 'sin', 'cos', 'tan', 'cot',
  'sec', 'csc', 'log', 'ln', 'exp', 'det', 'max', 'min', 'lim', 'sup', 'inf',
  'angle', 'perp', 'circ', 'deg', 'Re', 'Im',
]);

const MATH_FUNS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'det', 'dim', 'ker', 'gcd', 'lcm',
  'min', 'max', 'sup', 'inf', 'lim', 'arg', 'deg', 'abs', 're', 'im', 'tr',
  'span', 'rank', 'mod', 'sgn', 'erf', 'var',
]);
/** Lowercase unit names of four or more letters (shorter ones never read as prose words). */
const UNIT_WORDS = new Set(['mmol', 'kmol', 'nmol', 'pmol', 'umol', 'mbar', 'kcal']);

/** Sentence openers common in @quickcheck / @body prose (not raw formulas). */
const ENGLISH_STARTERS =
  /^(?:Why|What|How|When|Where|Which|Who|Whose|Is|Are|Was|Were|Does|Do|Did|Can|Could|Should|Would|Will|Has|Have|Had|Because|Yes|No|Not|The|If|With|During|Since|So|This|That|These|Those|In|At|For|From|To)\b/i;

/** "A battery…" / "An n-channel…" — not "A(t)=" / "A_0=". */
const ARTICLE_STARTER = /^(?:A|An)\s+[A-Za-z]/i;

const UNICODE_FRACS: Record<string, string> = {
  '½': '\\frac{1}{2}',
  '¼': '\\frac{1}{4}',
  '¾': '\\frac{3}{4}',
  '⅓': '\\frac{1}{3}',
  '⅔': '\\frac{2}{3}',
  '⅛': '\\frac{1}{8}',
  '⅜': '\\frac{3}{8}',
  '⅝': '\\frac{5}{8}',
  '⅞': '\\frac{7}{8}',
  '⅕': '\\frac{1}{5}',
  '⅖': '\\frac{2}{5}',
  '⅗': '\\frac{3}{5}',
  '⅘': '\\frac{4}{5}',
  '⅙': '\\frac{1}{6}',
  '⅚': '\\frac{5}{6}',
  '⅐': '\\frac{1}{7}',
  '⅑': '\\frac{1}{9}',
  '⅒': '\\frac{1}{10}',
};

const UNICODE_FRAC_RE = /[½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚⅐⅑⅒]/g;

const LATEX_OPERATOR =
  /^\\(?:quad|qquad|times|cdot|approx|neq|ne|leq|geq|le|ge|pm|mp|to|rightarrow|Rightarrow|iff|Leftrightarrow|implies|propto|sim|equiv|cong|subset|in|cdots|ldots|dots|circ|ast|star|oplus|otimes|wedge|vee|cap|cup|colon)\b/;

export type MathRenderMode = 'auto' | 'display';

/** Keep KaTeX work bounded when a malformed model response is very large. */
export const MAX_MATH_RENDER_CHARS = 120_000;

type MathSegment = { math: boolean; text: string };

type ProtectedCode = { text: string; literals: Array<{ token: string; value: string }> };

/**
 * Programming identifiers are not math: `snake_case_name`, `x_1_2` (two or more
 * underscores) and `max_value` (a word subscripted by a word).
 */
const CODE_IDENTIFIER =
  /[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+){2,}(?![A-Za-z0-9_{])|[A-Za-z][A-Za-z0-9]+_[A-Za-z][A-Za-z0-9]+(?![A-Za-z0-9_{])/y;

function protectCodeLiterals(src: string): ProtectedCode {
  const literals: ProtectedCode['literals'] = [];
  let out = '';
  let cursor = 0;
  let i = 0;

  const protect = (start: number, end: number) => {
    // Private-use sentinels contain no digits, operators, or LaTeX-like words,
    // so the later STEM token wrapper cannot mistake a placeholder for math.
    const ordinal = literals.length;
    const token = `\uE000${String.fromCharCode(
      0xe100 + Math.floor(ordinal / 0x1700),
      0xe100 + (ordinal % 0x1700),
    )}\uE001`;
    out += src.slice(cursor, start) + token;
    literals.push({ token, value: src.slice(start, end) });
    cursor = end;
    i = end;
  };

  while (i < src.length) {
    if (i === 0 || /[\s("']/.test(src[i - 1]!)) {
      const path = /^(?:https?:\/\/[^\s<>]+|(?:[A-Za-z]:[\\/]|(?:[A-Za-z0-9_.-]+[\\/])+)[^\s<>]*\.[A-Za-z][A-Za-z0-9]*)/.exec(src.slice(i));
      if (path) {
        protect(i, i + path[0].length);
        continue;
      }
    }
    const lineStart = i === 0 || src[i - 1] === '\n';
    if (lineStart) {
      const lineEnd = src.indexOf('\n', i);
      const openEnd = lineEnd === -1 ? src.length : lineEnd;
      const opening = /^\s{0,3}(`{3,}|~{3,})/.exec(src.slice(i, openEnd));
      if (opening?.[1]) {
        const fenceChar = opening[1][0]!;
        const fenceLength = opening[1].length;
        let closeStart = lineEnd === -1 ? src.length : lineEnd + 1;
        let blockEnd = src.length;
        while (closeStart < src.length) {
          const closeEnd = src.indexOf('\n', closeStart);
          const closeLineEnd = closeEnd === -1 ? src.length : closeEnd;
          const closeLine = src.slice(closeStart, closeLineEnd);
          const closing = /^\s{0,3}(`{3,}|~{3,})\s*$/.exec(closeLine);
          if (
            closing?.[1]?.[0] === fenceChar &&
            closing[1].length >= fenceLength
          ) {
            blockEnd = closeLineEnd;
            break;
          }
          if (closeEnd === -1) break;
          closeStart = closeEnd + 1;
        }
        protect(i, blockEnd);
        continue;
      }
    }

    if (src[i] === '`') {
      let runEnd = i + 1;
      while (src[runEnd] === '`') runEnd += 1;
      const marker = src.slice(i, runEnd);
      const close = src.indexOf(marker, runEnd);
      if (close !== -1) {
        protect(i, close + marker.length);
        continue;
      }
    }

    if (i === 0 || !/[A-Za-z0-9_\\]/.test(src[i - 1]!)) {
      CODE_IDENTIFIER.lastIndex = i;
      const identifier = CODE_IDENTIFIER.exec(src);
      if (identifier) {
        protect(i, i + identifier[0].length);
        continue;
      }
    }
    i += 1;
  }

  out += src.slice(cursor);
  return { text: out, literals };
}

function restoreCodeLiterals(src: string, literals: ProtectedCode['literals']): string {
  let out = src;
  // A replacement callback preserves `$` byte-for-byte; a replacement string
  // would interpret `$$` as the special "insert one dollar" sequence.
  for (const { token, value } of literals) out = out.replaceAll(token, () => value);
  return out;
}

function protectEscapedMathLiterals(src: string): ProtectedCode {
  const literals: ProtectedCode['literals'] = [];
  const text = src.replace(/\\\$\\\$[\s\S]*?\\\$\\\$|\\\$[^\n]*?\\\$/g, (value) => {
    const ordinal = literals.length;
    const token = `\uE010${String.fromCharCode(
      0xe200 + Math.floor(ordinal / 0x1600),
      0xe200 + (ordinal % 0x1600),
    )}\uE011`;
    literals.push({ token, value });
    return token;
  });
  return { text, literals };
}

function isEscapedAt(src: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && src[i] === '\\'; i--) slashes += 1;
  return slashes % 2 === 1;
}

function findUnescapedDelimiter(src: string, delimiter: '$' | '$$', from: number): number {
  let index = src.indexOf(delimiter, from);
  while (index !== -1) {
    if (!isEscapedAt(src, index)) return index;
    index = src.indexOf(delimiter, index + delimiter.length);
  }
  return -1;
}

/** Convert \(..\) / \[..\] to $..$ / $$..$$. */
export function normalizeMathDelimiters(src: string): string {
  return src
    .replace(/\\text\{[^{}]*\}/g, (text) => text.replace(/\\?\$/g, () => '\\textdollar{}'))
    // JSX/DOM extraction can preserve a doubled slash. Treat that as a
    // literal delimiter spelling instead of turning half of it into math.
    .replace(/\\\\\[(.+?)\\\\\]/gs, (_m, inner: string) =>
      '\\$\\$' + inner + '\\$\\$',
    )
    .replace(/\\\\\((.+?)\\\\\)/gs, (_m, inner: string) =>
      '\\$' + inner + '\\$',
    )
    .replace(/\\\[(.+?)\\\]/gs, (_m, inner: string) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, inner: string) => `$${inner}$`);
}

/**
 * KaTeX parses \\par inside \\parallel as a paragraph break. Use \\mathbin{\\|}
 * instead — equivalent glyph, no fragile brace groups for remark-math. As a sub/superscript
 * (W_\\parallel) it needs braces: KaTeX rejects a bare command that takes an argument there.
 */
export function protectFragileLatexCommands(src: string): string {
  return src
    .replace(/([_^])\s*\\parallel\b/g, '$1{\\mathbin{\\|}}')
    .replace(/\\parallel\b/g, '\\mathbin{\\|}');
}

/** Book-style stacked fractions for unicode vulgar fractions. */
export function normalizeUnicodeFractions(src: string): string {
  return src.replace(UNICODE_FRAC_RE, (ch) => UNICODE_FRACS[ch] ?? ch);
}

/**
 * Drop one unmatched `$$` token so a truncated display delimiter cannot make
 * remark-math consume the rest of a prose paragraph as one broken formula.
 */
export function repairUnmatchedDisplayDelimiter(src: string): string {
  let inline = false;
  let displayOpen: number | null = null;
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '$' || isEscapedAt(src, i)) continue;
    if (inline) {
      inline = false;
      continue;
    }
    if (displayOpen !== null) {
      if (src[i + 1] === '$') {
        displayOpen = null;
        i += 1;
      }
      continue;
    }
    if (src[i + 1] === '$') {
      displayOpen = i;
      i += 1;
      continue;
    }
    inline = true;
  }
  if (displayOpen === null) return src;
  const unmatched = displayOpen;
  return `${src.slice(0, unmatched)}${src.slice(unmatched + 2)}`;
}

function rootAtomEnd(src: string, start: number): number {
  let atomStart = start;
  if (src[atomStart] === '+' || src[atomStart] === '-') {
    atomStart = skipSpaces(src, atomStart + 1);
  }
  if (src[atomStart] === '{') {
    const arg = readBracedArg(src, atomStart);
    return arg ? atomStart + arg.length : start;
  }
  const atom = src.slice(atomStart).match(/^[A-Za-z0-9](?:_\{[^{}]+\}|_[A-Za-z0-9])?(?:\^\{[^{}]+\}|\^[A-Za-z0-9])?/);
  return atom ? atomStart + atom[0].length : start;
}

function normalizeRootText(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const named = src.slice(i).match(/^(sqrt|cbrt)\s*\(/i);
    const atBoundary = i === 0 || !/[A-Za-z0-9_\\]/.test(src[i - 1]!);
    if (named && atBoundary) {
      const open = i + named[0].lastIndexOf('(');
      const close = findMatching(src, open, '(', ')');
      if (close >= 0) {
        const index = named[1]!.toLowerCase() === 'cbrt' ? '[3]' : '';
        out += `\\sqrt${index}{${normalizeRootText(src.slice(open + 1, close))}}`;
        i = close + 1;
        continue;
      }
    }

    const symbol = src[i];
    if (symbol === '√' || symbol === '∛' || symbol === '∜') {
      const degree = symbol === '∛' ? '[3]' : symbol === '∜' ? '[4]' : '';
      const start = skipSpaces(src, i + 1);
      if (src[start] === '(') {
        const close = findMatching(src, start, '(', ')');
        if (close >= 0) {
          out += `\\sqrt${degree}{${normalizeRootText(src.slice(start + 1, close))}}`;
          i = close + 1;
          continue;
        }
      }
      const end = rootAtomEnd(src, start);
      if (end > start) {
        const atom = src.slice(start, end).replace(/^\{([\s\S]*)\}$/, '$1');
        out += `\\sqrt${degree}{${atom}}`;
        i = end;
        continue;
      }
    }

    out += src[i];
    i += 1;
  }
  return out;
}

/** Convert common calculator/plain-text root notation to documented KaTeX. */
export function normalizeRootNotation(src: string): string {
  return splitMathSegments(src)
    .map((segment) => normalizeRootText(segment.text))
    .join('');
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

function skipSpaces(src: string, i: number): number {
  while (i < src.length && src[i] === ' ') i++;
  return i;
}

function stripMathDecorations(text: string): string {
  let plain = '';
  let end = 0;
  for (const command of text.matchAll(/\\[A-Za-z]+/g)) {
    if (command.index < end) continue;
    plain += text.slice(end, command.index) + ' ';
    end = command.index + command[0].length;
    for (let argument = 0; argument < 2; argument += 1) {
      const start = skipSpaces(text, end);
      const braces = readBracedArg(text, start);
      if (!braces) break;
      end = start + braces.length;
    }
  }
  return (plain + text.slice(end))
    .replace(/_\{[^{}]*\}/g, ' ')
    .replace(/_[A-Za-z0-9]+/g, ' ')
    .replace(/\^\{[^{}]*\}/g, ' ')
    .replace(/\^[A-Za-z0-9+\-]+/g, ' ')
    .replace(/[{}_^$\\&]/g, ' ');
}

function countEnglishWords(text: string): number {
  return (stripMathDecorations(text).match(/\b[a-zA-Z]{3,}\b/g) ?? []).length;
}

/**
 * Natural-language sentences that mention symbols (e.g. V_C) must stay prose —
 * wrapping them in $..$ collapses spaces in KaTeX.
 */
export function looksLikeProseWithMath(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (ENGLISH_STARTERS.test(t) || ARTICLE_STARTER.test(t)) return true;
  return countEnglishWords(t) >= 1;
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

/** In TeX a bare `%` starts a comment that swallows the rest of the formula; in an answer it is a percent. */
function escapeMathPercent(math: string): string {
  return math.replace(/(?<!\\)%/g, '\\%');
}

function wrapAsMath(inner: string, display: boolean): string {
  const trimmed = inner.trim();
  if (!trimmed) return inner;
  if (isAlreadyDelimitedMath(trimmed)) return inner;
  // Keep display math on one line so re-processing does not split $$ across lines.
  return display ? `$$${escapeMathPercent(trimmed)}$$` : `$${escapeMathPercent(trimmed)}$`;
}

function isAlreadyDelimitedMath(text: string): boolean {
  const t = text.trim();
  if (/^\$\$[\s\S]+\$\$$/.test(t)) return true;
  return /^\$[^$\n]+\$$/.test(t);
}

/**
 * `$5 … $` opens with an amount and does not close like math: the closing `$`
 * follows a space or precedes a digit (`$7, so $12`), or the span is prose.
 */
function isCurrencySpan(line: string, open: number, close: number): boolean {
  if (!/\d/.test(line[open + 1] ?? '')) return false;
  return /\s/.test(line[close - 1]!) || /\d/.test(line[close + 1] ?? '') ||
    looksLikeProseWithMath(line.slice(open + 1, close));
}

/** Split a line into math-delimited and plain-text runs. */
export function splitMathSegments(line: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let i = 0;

  while (i < line.length) {
    // Inline code is literal: `$$not math$$` must survive byte for byte.
    if (line[i] === '`') {
      const close = line.indexOf('`', i + 1);
      if (close !== -1) {
        segments.push({ math: false, text: line.slice(i, close + 1) });
        i = close + 1;
        continue;
      }
    }

    // An escaped `\$` is a literal dollar sign, never a delimiter.
    if (line[i] === '\\' && line[i + 1] === '$') {
      segments.push({ math: false, text: line.slice(i, i + 2) });
      i += 2;
      continue;
    }

    if (line.startsWith('$$', i)) {
      const end = findUnescapedDelimiter(line, '$$', i + 2);
      if (end !== -1) {
        segments.push({ math: true, text: line.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
    }

    if (line[i] === '$' && line[i + 1] !== '$') {
      const end = findUnescapedDelimiter(line, '$', i + 1);
      if (end !== -1) {
        if (isCurrencySpan(line, i, end)) {
          segments.push({ math: true, text: '\\$' + line.slice(i + 1, end) });
          i = end;
          continue;
        }
        segments.push({ math: true, text: line.slice(i, end + 1) });
        i = end + 1;
        continue;
      }
    }

    let end = i;
    while (end < line.length) {
      if (line[end] === '`' || (line[end] === '\\' && line[end + 1] === '$')) break;
      if (line[end] === '$' && !isEscapedAt(line, end)) break;
      end += 1;
    }
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

/** `$5 and $7` is money the model never meant as math. */
const CURRENCY_OPENER = /^\$\d/;

/**
 * A delimited span is prose only when it reads as a phrase: two or more sentence
 * words (3+ letters, lowercase or Capitalised). Point names (`ABC`), unit symbols
 * and math functions never count, so `$\angle ABC = 90^{\circ}$` stays one formula.
 */
function isProseInsideDelimiters(inner: string): boolean {
  return (stripMathDecorations(inner).match(/\b(?:[A-Z][a-z]{2,}|[a-z]{3,})\b/g) ?? [])
    .filter((word) => !MATH_FUNS.has(word.toLowerCase())).length >= 2;
}

function unwrapProseMathDelimiters(segment: string): string {
  const t = segment.trim();
  if (t.startsWith('$$') && t.endsWith('$$')) {
    const inner = t.slice(2, -2);
    return isProseInsideDelimiters(inner) ? inner : segment;
  }
  if (t.startsWith('$') && t.endsWith('$') && t.length > 2) {
    const inner = t.slice(1, -1);
    // Two currency amounts read as one `$..$` span. Escaping keeps both dollar
    // signs visible; dropping them would silently delete them from the prose.
    if (CURRENCY_OPENER.test(t) && looksLikeProseWithMath(inner)) return segment.replace(/\$/g, '\\$');
    return isProseInsideDelimiters(inner) ? inner : segment;
  }
  return segment;
}

function parseSubSup(src: string, i: number): number {
  let k = i;
  while (k < src.length && (src[k] === '_' || src[k] === '^')) {
    const next = src[k + 1];
    if (next === '{') {
      const arg = readBracedArg(src, k + 1);
      if (!arg) break;
      k = k + 1 + arg.length;
    } else if (next === '\\') {
      const cmd = src.slice(k + 1).match(/^\\[A-Za-z]+/);
      if (!cmd) break;
      k = k + 1 + cmd[0].length;
    } else if (next === '(') {
      // Plain text: y^(n+1) raises the whole group.
      const close = findMatching(src, k + 1, '(', ')');
      if (close === -1) break;
      k = close + 1;
    } else if (next && /[\p{L}\p{N}+\-−*'′]/u.test(next)) {
      // Plain text: 10^-5 and 10^12 raise the whole signed number.
      k += 1 + (src.slice(k + 1).match(/^[+\-−]?\d+(?:\.\d+)?/)?.[0].length || 1);
    } else {
      break;
    }
  }
  return k;
}

function skipLeftRightDelim(src: string, i: number): number {
  if (i >= src.length) return i;
  const c = src[i]!;
  if ('()[]|.<>/'.includes(c)) return i + 1;
  if (c !== '\\') return i;
  const named = src.slice(i).match(
    /^\\(?:\{|\}|\||langle|rangle|lvert|rvert|lVert|rVert|lfloor|rfloor|lceil|rceil|backslash|ulcorner|urcorner)/,
  );
  if (named) return i + named[0].length;
  return i;
}

function parseLeftRight(src: string, i: number): number {
  if (!src.startsWith('\\left', i)) return i;
  let k = skipSpaces(src, i + 5);
  const afterDelim = skipLeftRightDelim(src, k);
  if (afterDelim === k) return i;
  k = afterDelim;
  let depth = 1;
  while (k < src.length) {
    if (src.startsWith('\\left', k)) {
      depth++;
      k = skipSpaces(src, k + 5);
      const d = skipLeftRightDelim(src, k);
      if (d === k) return i;
      k = d;
      continue;
    }
    if (src.startsWith('\\right', k)) {
      depth--;
      k = skipSpaces(src, k + 6);
      const d = skipLeftRightDelim(src, k);
      if (d === k) return i;
      k = d;
      if (depth === 0) return parseSubSup(src, k);
      continue;
    }
    k++;
  }
  return i;
}

function parseBeginEnd(src: string, i: number): number {
  const open = src.slice(i).match(/^\\begin\s*\{([A-Za-z*]+)\}/);
  if (!open) return i;
  const env = open[1]!;
  const closeRe = new RegExp(String.raw`\\end\s*\{${env.replace(/[*]/g, '\\*')}\}`);
  const rest = src.slice(i + open[0].length);
  const close = closeRe.exec(rest);
  if (!close || close.index === undefined) return i;
  return parseSubSup(src, i + open[0].length + close.index + close[0].length);
}

function parseLatexCommand(src: string, i: number): number {
  if (src[i] !== '\\') return i;
  if (src.startsWith('\\left', i) || src.startsWith('\\right', i)) return i;
  if (src.startsWith('\\begin', i) || src.startsWith('\\end', i)) return i;
  const cmd = src.slice(i).match(/^\\[A-Za-z]+/)?.[0];
  if (!cmd) {
    if (/^\\[,;:! ]/.test(src.slice(i))) return i + 2;
    return i;
  }

  let k = i + cmd.length;
  let tmp = skipSpaces(src, k);
  if (src[tmp] === '[') {
    const close = src.indexOf(']', tmp);
    if (close !== -1) tmp = close + 1;
  }
  tmp = skipSpaces(src, tmp);
  const args: string[] = [];
  for (let a = 0; a < 2; a++) {
    const arg = readBracedArg(src, tmp);
    if (!arg) break;
    args.push(arg);
    tmp += arg.length;
    tmp = skipSpaces(src, tmp);
  }

  if (TWO_ARG_SNIPPET_CMD.test(cmd)) {
    if (args.length < 2) return i;
    return parseSubSup(src, tmp);
  }
  if (SINGLE_ARG_SNIPPET_CMD.test(cmd)) {
    if (args.length < 1) return i;
    return parseSubSup(src, tmp);
  }
  if (args.length >= 1) return parseSubSup(src, tmp);
  if (ZERO_ARG_NAMES.has(cmd.slice(1))) return parseSubSup(src, k);
  return i;
}

function parseAbsBar(src: string, i: number): number {
  if (src[i] !== '|') return i;
  const vec = src.slice(i).match(/^\|(\\vec\{[^}]+\})\|/);
  if (vec) return parseSubSup(src, i + vec[0].length);
  const ident = src.slice(i).match(/^\|([A-Za-z][A-Za-z0-9]*(?:_\{[^{}]+\}|_[A-Za-z0-9]+)?)(\^\{[^{}]+\}|\^[A-Za-z0-9]+)?\|/);
  if (ident) return parseSubSup(src, i + ident[0].length);
  return i;
}

function findMatching(src: string, openIdx: number, open: string, close: string): number {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseFunctionCall(src: string, i: number): number {
  const m = src.slice(i).match(/^([A-Za-z][A-Za-z0-9]*)\(/);
  if (!m) return i;
  const name = m[1]!;
  const ok = name.length <= 2 || MATH_FUNS.has(name.toLowerCase()) || /_/.test(name);
  if (!ok) return i;
  const open = i + name.length;
  const close = findMatching(src, open, '(', ')');
  if (close < 0) return i;
  const inner = src.slice(open + 1, close);
  if (!innerIsMath(inner)) return i;
  return parseSubSup(src, close + 1);
}

function parseIdentSubSup(src: string, i: number): number {
  // A Unicode Greek letter can carry the script too (μ_k, ω_n); KaTeX typesets it in math mode.
  const m = src.slice(i).match(/^\d*[A-Za-zΑ-Ωα-ωµ][A-Za-z0-9]*/);
  if (!m) return i;
  const k = i + m[0].length;
  if (src[k] !== '_' && src[k] !== '^') return i;
  const end = parseSubSup(src, k);
  // A script mark with nothing to raise ("R_Y_" in genetics) is notation, not math.
  if (src[end] === '_' || src[end] === '^') return i;
  return end === k ? i : end;
}

function parseScientific(src: string, i: number): number {
  const full = src.slice(i).match(/^\d+(?:\.\d+)?\s*(?:\\times|×)\s*10(?:\^\{[^{}]+\}|\^[+\-]?\d+)/);
  if (full && full.index === 0) return i + full[0].length;
  const ten = src.slice(i).match(/^10(?:\^\{[^{}]+\}|\^[+\-]?\d+)/);
  if (ten && ten.index === 0) return i + ten[0].length;
  return i;
}

function parseUnicodeFrac(src: string, i: number): number {
  if (src[i] && UNICODE_FRACS[src[i]!]) return parseSubSup(src, i + 1);
  return i;
}

function parseSimpleFraction(src: string, i: number): number {
  const m = src.slice(i).match(/^\d{1,4}\/\d{1,4}(?!\d)/);
  return m ? i + m[0].length : i;
}

function parseNumber(src: string, i: number): number {
  const m = src.slice(i).match(/^\d+(?:\.\d+)?/);
  if (!m) return i;
  let k = i + m[0].length;
  const unit = src.slice(k).match(/^(?:Ω|°|%|\\Omega\b|\\circ\b|\\%)/);
  if (unit) k += unit[0].length;
  return k;
}

function parseParens(src: string, i: number): number {
  if (src[i] !== '(') return i;
  const close = findMatching(src, i, '(', ')');
  if (close < 0) return i;
  const inner = src.slice(i + 1, close);
  const unitRatio = /^[A-Za-z]+(?:\s*[\/×·]\s*[A-Za-z]+)+$/.test(inner.trim());
  if (!innerIsMath(inner) && !unitRatio) return i;
  return parseSubSup(src, close + 1);
}

function parseStrongAtom(src: string, i: number): number {
  if (i >= src.length) return i;
  if (src[i] === '\\') {
    const env = parseBeginEnd(src, i);
    if (env > i) return env;
    const lr = parseLeftRight(src, i);
    if (lr > i) return lr;
    const cmd = parseLatexCommand(src, i);
    if (cmd > i) return cmd;
  }
  const abs = parseAbsBar(src, i);
  if (abs > i) return abs;
  const call = parseFunctionCall(src, i);
  if (call > i) return call;
  const ident = parseIdentSubSup(src, i);
  if (ident > i) return ident;
  const sci = parseScientific(src, i);
  if (sci > i) return sci;
  const uni = parseUnicodeFrac(src, i);
  if (uni > i) return uni;
  const frac = parseSimpleFraction(src, i);
  if (frac > i) return frac;
  const parens = parseParens(src, i);
  if (parens > i) return parens;
  return i;
}

function parsePlainIdent(src: string, i: number): number {
  const m = src.slice(i).match(/^[A-Za-z][A-Za-z0-9]*/);
  return m ? i + m[0].length : i;
}

function parseOperator(src: string, i: number): number {
  const k = skipSpaces(src, i);
  if (k >= src.length) return i;
  if (/^\\[,;:! ]/.test(src.slice(k))) return skipSpaces(src, k + 2);
  const latexOp = src.slice(k).match(LATEX_OPERATOR);
  if (latexOp) return skipSpaces(src, k + latexOp[0].length);
  const two = src.slice(k, k + 2);
  if (['<=', '>=', '==', '!=', '->', '<-', '~='].includes(two)) return skipSpaces(src, k + 2);
  const c = src[k]!;
  if ('=+-−/*^<>≈≠≤≥×·∝∼≡≅∈⊂→←'.includes(c)) return skipSpaces(src, k + 1);
  return i;
}

function parseAtomInExpr(src: string, i: number): number {
  const strong = parseStrongAtom(src, i);
  if (strong > i) return strong;
  const num = parseNumber(src, i);
  if (num > i) return num;
  const id = parsePlainIdent(src, i);
  if (id === i + 1) return parseSubSup(src, id);
  return i;
}

function innerIsMath(inner: string): boolean {
  const t = inner.trim();
  if (!t) return true;
  if (countEnglishWords(t) >= 2) return false;
  // A real word next to a number makes a parenthesis prose: "(below 180°)", not b·e·l·o·w.
  if (/\d/.test(t) && (t.match(/\b[a-z]{4,}\b/g) ?? []).some((word) => !MATH_FUNS.has(word) && !UNIT_WORDS.has(word))) return false;
  let i = 0;
  let sawAtom = false;
  while (i < t.length) {
    if (t[i] === ' ') {
      i++;
      continue;
    }
    const atom = parseAtomInExpr(t, i);
    if (atom > i) {
      sawAtom = true;
      i = atom;
      continue;
    }
    const op = parseOperator(t, i);
    if (op > i) {
      i = op;
      continue;
    }
    if (/^[A-Za-z]/.test(t[i]!)) {
      sawAtom = true;
      i += 1;
      continue;
    }
    if (',;:'.includes(t[i]!)) {
      i += 1;
      continue;
    }
    return false;
  }
  return sawAtom;
}

function parseLeadingIdentExpr(src: string, i: number): number {
  const id = parsePlainIdent(src, i);
  if (id !== i + 1) return i;
  const op = parseOperator(src, id);
  if (op === id) return i;
  const rhs = parseAtomInExpr(src, op);
  return rhs > op ? rhs : i;
}

function parseMathExpr(src: string, start: number): number {
  let end = parseStrongAtom(src, start);
  if (end === start) end = parseLeadingIdentExpr(src, start);
  if (end === start) {
    const n = parseNumber(src, start);
    if (n > start) {
      const k = skipSpaces(src, n);
      const s = parseStrongAtom(src, k);
      if (s > k) end = s;
    }
  }
  if (end === start) return start;

  for (;;) {
    const op = parseOperator(src, end);
    if (op > end) {
      const atom = parseAtomInExpr(src, op);
      if (atom > op) {
        end = atom;
        continue;
      }
      break;
    }
    const sp = skipSpaces(src, end);
    const next = sp > end ? sp : end;
    const atom = parseAtomInExpr(src, next);
    if (atom > next) {
      // Juxtaposition: number/strong/1-letter only. Reject "is"/"at"/"of".
      const strong = parseStrongAtom(src, next);
      const num = parseNumber(src, next);
      const oneLetter = parsePlainIdent(src, next) === next + 1;
      if (strong > next || num > next || oneLetter) {
        end = atom;
        continue;
      }
    }
    break;
  }

  while (end > start && src[end - 1] === ' ') end--;
  return end;
}

/** Any Unicode letter or digit — Greek included, so `Δx` is one token. */
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function isMathBoundary(src: string, i: number): boolean {
  if (i <= 0) return true;
  const prev = src[i - 1]!;
  const cur = src[i]!;
  // Don't start a match in the middle of a word (`rad/s^2` → not `d/s^2`), and
  // never split a symbol from its Greek prefix (`Δx` → not `Δ$x$`).
  // Do allow `b|\vec{R}|`, `x_0`, `2\pi` (digit/symbol boundaries).
  if (WORD_CHARACTER.test(prev) && WORD_CHARACTER.test(cur)) return false;
  return true;
}

const UNIT_SYMBOL = String.raw`[pnumcdkMGT]?(?:mol|cd|Pa|Hz|Wb|eV|rad|sr|atm|bar|min|m|g|s|A|K|N|J|W|V|C|F|H|T|S|L|h)(?:\^\{?[+\-]?\d+\}?)?`;
const TRAILING_UNIT = new RegExp(String.raw`(\d)\s+(${UNIT_SYMBOL}(?:\s*[/·*]\s*${UNIT_SYMBOL})*)$`);

/** `g = 9.81 m/s^2` → `g = 9.81\,\mathrm{m/s^2}`: a unit after a number is upright, not a variable. */
function uprightTrailingUnit(math: string): string {
  return math.replace(TRAILING_UNIT, (_match, digit: string, unit: string) => `${digit}\\,\\mathrm{${unit}}`);
}

/** `10^-5` → `10^{-5}`, `y^(n+1)` → `y^{n+1}`: TeX raises one token, plain text means the whole exponent. */
function bracePlainExponents(math: string): string {
  return math
    .replace(/\^\(([^()]*)\)/g, '^{$1}')
    .replace(/\^([+\-−]?\d+(?:\.\d+)?)/g, (whole, exponent: string) => (exponent.length > 1 ? `^{${exponent}}` : whole));
}

/** `V_out` → `V_{out}`: a one-letter symbol takes the whole word as its subscript. */
function braceWordSubscripts(text: string): string {
  return text.replace(
    /(^|[^A-Za-z0-9\\_])([A-Za-z])_([A-Za-z]{2,}[0-9]*|[0-9]{2,})(?![A-Za-z0-9_{])/g,
    '$1$2_{$3}',
  );
}

function wrapUndelimitedStemTokens(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        out += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }
    const end = isMathBoundary(text, i) ? parseMathExpr(text, i) : i;
    if (end > i) {
      if (out.endsWith('$')) out += ' ';
      out += wrapAsMath(bracePlainExponents(uprightTrailingUnit(text.slice(i, end))), false);
      i = end;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

function wrapStemTokens(text: string): string {
  return splitMathSegments(text)
    .map((seg) => (seg.math ? seg.text : wrapUndelimitedStemTokens(seg.text)))
    .join('');
}

function wrapFragmentsInLine(line: string): string {
  if (isStructuralMarkdownLine(line) || !line.trim()) return line;

  if (isAlreadyDelimitedMath(line)) {
    const unwrapped = unwrapProseMathDelimiters(line.trim());
    if (unwrapped !== line.trim()) return wrapFragmentsInLine(unwrapped);
    return line;
  }

  if (!hasMathDelimiters(line)) {
    return wrapStemTokens(line);
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
      return wrapStemTokens(seg.text);
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

/**
 * `$E =⏎mc^2$`: models wrap long inline math onto the next line. Markdown reads a
 * soft break as a space, so rejoin the two lines when the `$` pair is tight
 * (no space inside either delimiter, no digit after the closer).
 */
function joinSoftBrokenInlineMath(src: string): string {
  const lines = src.split('\n');
  for (let n = 0; n + 1 < lines.length; n++) {
    const line = lines[n]!;
    const next = lines[n + 1]!;
    if (isStructuralMarkdownLine(line) || isStructuralMarkdownLine(next)) continue;
    if (/^\s*(?:[-*+>]|\d+[.)])\s/.test(next)) continue;
    const segments = splitMathSegments(line);
    const tail = segments.at(-1)!;
    const opener = segments.at(-2);
    if (opener?.math !== false || opener.text !== '$' || tail.math) continue;
    if (!/^[^\s\d]/.test(tail.text) || /[$`]/.test(tail.text)) continue;
    const close = findUnescapedDelimiter(next, '$', 0);
    if (close < 1 || /\s/.test(next[close - 1]!) || /[$\d]/.test(next[close + 1] ?? '')) continue;
    if (next.slice(0, close).includes('`')) continue;
    lines.splice(n, 2, `${line.trimEnd()} ${next.trimStart()}`);
    n -= 1;
  }
  return lines.join('\n');
}

/** Wrap undelimited LaTeX after list markers or colons within a prose line. */
function wrapInlineRawLatexSegments(line: string): string {
  if (hasMathDelimiters(line)) return line;
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
export function prepareMathForRender(content: string, mode: MathRenderMode = 'auto', markdown = false): string {
  if (content.length > MAX_MATH_RENDER_CHARS) {
    return 'Math content is too large to typeset safely.';
  }
  const protectedCode = protectCodeLiterals(content);
  let src = dedupeComposerMath(stripProtocolMarkers(protectedCode.text));
  if (!src.trim()) return src;

  src = protectFragileLatexCommands(src);
  src = normalizeMathDelimiters(src);
  const protectedEscapedMath = protectEscapedMathLiterals(src);
  src = protectedEscapedMath.text;
  const displayLiterals: ProtectedCode['literals'] = [];
  const markdownDelimiters = (value: string) => markdown
    ? value.replace(/^([\t ]*)\$\$([\s\S]*?)\$\$[\t ]*(?=\n|$)/gm,
      (_match, indent: string, math: string) => `${indent}$$\n${math.trim().split('\n').map((line) => indent + line).join('\n')}\n${indent}$$`)
    : value;
  const restoreLiterals = (value: string) =>
    restoreCodeLiterals(
      restoreCodeLiterals(markdownDelimiters(restoreCodeLiterals(value, displayLiterals)), protectedEscapedMath.literals),
      protectedCode.literals,
    );
  src = repairUnmatchedDisplayDelimiter(src);
  src = normalizeUnicodeFractions(src);
  src = normalizeRootNotation(src);

  const forceDisplay = mode === 'display';
  const trimmed = src.trim();

  if (forceDisplay && trimmed && !hasMathDelimiters(trimmed)) {
    return restoreLiterals(wrapAsMath(braceWordSubscripts(trimmed), true));
  }

  if (forceDisplay && /^\$[^$\n]+\$$/.test(trimmed)) {
    return restoreLiterals(wrapAsMath(trimmed.slice(1, -1), true));
  }

  // Everything inside a fenced code block is literal: the student is reading
  // code, not math, and `let x_1 = $2;` must survive byte for byte.
  let inFence = false;
  src = src.replace(/(?<!\\)\$\$[\s\S]*?\$\$/g, (value) => {
    if (!value.includes('\n')) return value;
    const token = `\uE020${String.fromCharCode(0xe300 + displayLiterals.length)}\uE021`;
    displayLiterals.push({ token, value });
    return token;
  });
  const lines = joinSoftBrokenInlineMath(src).split('\n');
  const prepared = lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      line = splitMathSegments(line).map((segment) => {
        // remark-math ends inline math at any `$`, even an escaped one.
        if (segment.math) {
          return segment.text.startsWith('$')
            ? escapeMathPercent(segment.text.replace(/(?<!\\)\\\$/g, '\\text{\\textdollar}'))
            : segment.text;
        }
        if (segment.text === '$') return markdown ? '\\$' : '$';
        return braceWordSubscripts(segment.text);
      }).join('');
      if (markdown && /^\s*\|/.test(line)) {
        return splitMathSegments(line).map((segment) => segment.math
          ? segment.text.replace(/(?<!\\)\|/g, '\\vert ')
          : segment.text).join('');
      }
      return wrapInlineRawLatexSegments(wrapFragmentsInLine(wrapRawLatexLine(line, forceDisplay)));
    })
    .join('\n');
  return restoreLiterals(prepared);
}
