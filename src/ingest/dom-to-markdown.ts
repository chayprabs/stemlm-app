/**
 * Rendered assistant message -> Markdown with LaTeX restored.
 *
 * Host-agnostic: one walker over the message DOM that knows every way the four
 * hosts (and KaTeX / MathJax in general) keep the TeX source next to the typeset
 * glyphs, and which parts of a message are host chrome rather than answer text.
 * Reads the DOM only, never throws, and is bounded in nodes visited and output.
 *
 * Markup facts below cite where they were checked:
 *  [katex-copy-tex]  KaTeX contrib/copy-tex/katex2tex.ts (official copy handler)
 *  [voyager]         voyager-crew/voyager: features/formulaCopy/formulaSource.ts,
 *                    features/export/services/exportDomPolicy.ts, catalog/sites/*
 *  [grok-export]     andrewfung729/vmscript-grok-export: src/grok-export/dom/selectors.ts
 *  [mathjax-v2]      MathJax-docs v2.7 advanced/model.rst ("How mathematics is stored in the page")
 *  [mathjax-v4]      MathJax-docs upgrading/whats-new-4.0/input.rst (data-latex attributes)
 *  [chatgpt-export]  rashidazarang/chatgpt-chat-exporter: exporter-markdown.js
 *  [vesti]           abraxas914/VESTI: parser/claude/ClaudeParser.ts
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** A long answer with many KaTeX spans is a few thousand nodes; this only stops pathological DOM. */
const MAX_NODES = 60_000;
const MAX_DEPTH = 160;
/** Same bound the capsule parser accepts, so the structurer never sees more than it can handle. */
export const MAX_MARKDOWN_CHARS = 256_000;

type BlockKind = 'text' | 'list' | 'other';

interface Budget {
  nodes: number;
  chars: number;
  spent: boolean;
  codeHosts: Map<Element, CodeBlock | null>;
}

/** Inline context: which wrappers are already open, so nesting never doubles a marker. */
interface Inline {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  link: boolean;
  cell: boolean;
}

const PLAIN: Inline = { bold: false, italic: false, strike: false, link: false, cell: false };

interface CodeBlock {
  lang: string;
  code: string;
}

type MathSource = { tex: string; display: boolean } | { text: string };

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'center', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
  'figure', 'header', 'li', 'main', 'p', 'section', 'tbody', 'td', 'th', 'thead', 'tr',
]);

/** Never answer text, whatever the host. */
const CHROME_TAGS = new Set([
  'audio', 'button', 'canvas', 'embed', 'footer', 'form', 'iframe', 'input', 'nav', 'noscript',
  'object', 'option', 'script', 'select', 'style', 'svg', 'template', 'textarea', 'video',
  // Gemini custom elements [voyager exportDomPolicy]: icons, source chips, thoughts, action rows.
  'mat-icon', 'sources-carousel-inline', 'source-inline-chips', 'source-inline-chip',
  'source-footnote', 'sources-list', 'model-thoughts', 'message-actions', 'share-button',
  'copy-button', 'download-generated-image-button',
]);

const CHROME_SELECTOR = [
  '[hidden]',
  '[aria-hidden="true"]',
  '[role="button"]',
  '[role="toolbar"]',
  '[role="tooltip"]',
  '[role="menu"]',
  '[role="dialog"]',
  // Screen-reader labels ("ChatGPT said:") [chatgpt-export], [vesti].
  '.sr-only',
  '.visually-hidden',
  '.visuallyhidden',
  // ChatGPT: chrome its own copy leaves out, turn labels and action rows [voyager], [chatgpt-export].
  '[data-markdown-copy="exclude"]',
  '[data-message-attribution]',
  'h4[data-conversation-role]',
  '[data-message-actions]',
  '[data-message-content-controls]',
  '[popover]',
  // Citation chips and source pills on ChatGPT / Grok [chatgpt-export], [grok-export].
  'a.citation',
  '[data-citation]',
  '[data-testid*="citation"]',
  '[data-testid*="sources"]',
  '[class*="citation"]',
  // Gemini classes [voyager exportDomPolicy].
  '.model-thoughts',
  '.thoughts-container',
  '.thoughts-content',
  '.thoughts-header',
  '.message-actions',
  '.table-footer',
  '.export-sheets-button',
  '.copy-button',
  '.action-button',
  '.source-inline-chip-container',
  '.code-block-decoration',
  // Grok reasoning block and action row [grok-export].
  '.thinking-container',
  '.action-buttons',
  '[data-testid="canvas-trigger"]',
  // Claude action bar and status rows ([vesti]; the status-row class is their reading, not ours).
  '[data-testid*="action-bar"]',
  '[class*="group/status"]',
  '[data-testid*="thinking"]',
  '[data-testid*="reasoning"]',
].join(',');

/** Hosts that mark the whole code block, toolbar included [voyager], [grok-export]. */
const KNOWN_CODE_HOSTS = '[data-markdown-copy="code-block"], [data-testid="code-block"], code-block';
const CODE_SKIP_SELECTOR =
  'button, [role="button"], svg, style, script, [data-markdown-copy="exclude"], .linenumber, .line-number, .line-numbers-rows, .hljs-ln-numbers, .gutter';
/** Content that proves a wrapper around a <pre> is prose, not a toolbar. */
const WRAPPER_CONTENT_SELECTOR =
  'p, li, h1, h2, h3, h4, h5, h6, table, blockquote, ul, ol, pre, img, math, mjx-container, [data-math], .katex';
const WRAPPER_CONTENT_TAGS = new Set([
  'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'blockquote', 'ul', 'ol', 'pre', 'img', 'math', 'mjx-container',
]);
const TOOLBAR_WORDS = new Set([
  'copy', 'copied', 'copy code', 'copied!', 'edit', 'run', 'download', 'wrap', 'unwrap', 'expand',
  'collapse', 'preview', 'code', 'save', 'share', 'retry',
]);
const PLAIN_LANGUAGES = new Set(['plaintext', 'plain', 'text', 'txt', 'none', 'plain text']);
const LANGUAGE_ALIASES: Record<string, string> = { 'c++': 'cpp', 'c#': 'csharp', 'f#': 'fsharp', 'objective-c': 'objectivec' };

/** Attributes third-party renderers use for the TeX source; only read on math-like elements. */
const TEX_ATTRIBUTES = ['data-math', 'data-math-source', 'data-latex', 'data-tex', 'data-katex', 'data-formula', 'data-equation', 'data-original'];
const MATH_WRAPPER_CLASS = /(?:^|\s)(?:math-inline|math-block|math-display|math|MathJax_[A-Za-z_]+|MathJax|MJXc-display|mjx-chtml)(?:\s|$)/;
const MATHJAX2_FRAME = /(?:^|\s)(?:MathJax(?:_Display|_Preview|_SVG|_SVG_Display|_CHTML|_MathML)?|MJXc-display|mjx-chtml)(?:\s|$)/;
const REASONING_LABEL = /^\s*(?:thought|thinking|think\b|reason|show thinking|analy[sz]|worked for|searched|browsing)/i;

/**
 * ChatGPT prints citation tokens as text: `:contentReference[oaicite:0]{index=0}`, `【4†source】`,
 * and private-use delimiters U+E200..U+E20F around "turn0search0" [chatgpt-export]. Zero-width
 * characters (Grok prefixes citation text with U+2060 [grok-export]) are never content either.
 */
const CITATION_TOKENS = /[ \t]*(?::contentReference\[[^\]\n]*\]\{[^}\n]*\}|【[^】\n]*†[^】\n]*】)|[^]*|[-]|[​⁠﻿]/g;

/**
 * Math the host left unrendered in a text node. It is passed through untouched so the panel can
 * typeset what the chat could not; `$` pairs count only when the inside looks like TeX, so two
 * prices in one sentence stay prices.
 */
const RAW_MATH = /\$\$[^$]+\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?=[^\s$])[^$\n]*[\\^_=][^$\n]*(?<=[^\s$\\])\$(?!\d)/g;

const WORD_CHAR = /[\p{L}\p{N}]/u;
const OPENING_PUNCTUATION = /^[([（【《「『“‘"']+/;
const CLOSING_PUNCTUATION = /[)\]）】》」』”’"':：,，.。;；!！?？、]+$/;

class Flow {
  readonly blocks: Array<{ md: string; kind: BlockKind }> = [];
  private line = '';

  constructor(
    private readonly budget: Budget,
    /** Headings, table cells and emphasis hold one line: blocks degrade to inline content. */
    readonly inlineOnly = false,
  ) {}

  get lastChar(): string {
    return this.line.slice(-1);
  }

  private get atLineStart(): boolean {
    return this.line === '' || this.line.endsWith('\n');
  }

  /** Inline content that is already Markdown. */
  append(md: string): void {
    if (!md) return;
    if (md.startsWith(' ') && (this.line.endsWith(' ') || (!this.inlineOnly && this.atLineStart))) {
      md = md.replace(/^ +/, '');
    }
    this.line += md;
  }

  /** Literal text from the page: collapsed like a browser would, escaped only where Markdown would misread it. */
  text(raw: string, st: Inline): void {
    let s = raw.replace(CITATION_TOKENS, '').replace(/[\s ]+/g, ' ');
    if (!s) return;
    const lineStart = !this.inlineOnly && this.atLineStart;
    if (s.startsWith(' ') && (lineStart || this.line.endsWith(' '))) s = s.slice(1);
    if (!s) return;
    this.line += escapeProse(s, lineStart, this.lastChar, st);
  }

  breakLine(): void {
    if (this.inlineOnly) {
      this.append(' ');
      return;
    }
    const kept = this.line.replace(/ +$/, '');
    // A break before any text, or a second break in a row, has nothing to end.
    this.line = !kept || kept.endsWith('\n') ? kept : `${kept}\\\n`;
  }

  flush(): void {
    if (this.inlineOnly) {
      if (this.line && !this.line.endsWith(' ')) this.line += ' ';
      return;
    }
    let text = this.line;
    while (text.endsWith('\\\n')) text = text.slice(0, -2);
    text = text.replace(/ +\n/g, '\n').trim();
    this.line = '';
    if (text) this.push(text, 'text');
  }

  block(md: string, kind: BlockKind = 'other'): void {
    if (!md) return;
    if (this.inlineOnly) {
      this.append(` ${md.replace(/\s*\n\s*/g, ' ')} `);
      return;
    }
    this.flush();
    this.push(md, kind);
  }

  inline(): string {
    return this.line.replace(/\\?\n/g, ' ');
  }

  private push(md: string, kind: BlockKind): void {
    this.blocks.push({ md, kind });
    this.budget.chars += md.length + 2;
    if (this.budget.chars > MAX_MARKDOWN_CHARS) this.budget.spent = true;
  }
}

function hasToken(classes: string, token: string): boolean {
  return classes === token || ` ${classes} `.includes(` ${token} `);
}

function tagOf(el: Element): string {
  return (el.localName || el.tagName || '').toLowerCase();
}

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function escapeRun(s: string, lineStart: boolean, prev: string, st: Inline): string {
  let head = '';
  if (lineStart) {
    const ordered = /^(\d{1,9})([.)])(?= |$)/.exec(s);
    if (ordered) {
      head = `${ordered[1]}\\${ordered[2]}`;
      s = s.slice(ordered[0].length);
    } else if (/^(?:#{1,6}(?= |$)|[-+](?= |$)|-{3,}\s*$|=|>|~~~)/.test(s)) {
      // Heading, bullet, rule, setext underline, quote, tilde fence. A leading `=` is escaped for
      // the render path too: prepareMathForRender regroups a body that has a line starting "= ".
      head = `\\${s[0]}`;
      s = s.slice(1);
    }
  }
  const pairedTilde = (s.match(/~/g)?.length ?? 0) > 1;
  let out = head;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const before = i > 0 ? s[i - 1]! : head ? head.slice(-1) : prev;
    const after = s[i + 1] ?? '';
    switch (ch) {
      case '`':
      case '$':
        out += `\\${ch}`;
        break;
      case '*':
        out += before === ' ' && after === ' ' ? ch : '\\*';
        break;
      case '_': {
        // Intraword underscores never open emphasis in CommonMark, so snake_case stays readable.
        const intraword = WORD_CHAR.test(before) && WORD_CHAR.test(after);
        out += intraword || (before === ' ' && after === ' ') ? ch : '\\_';
        break;
      }
      case '~':
        out += pairedTilde ? '\\~' : ch;
        break;
      case '<':
        out += /[A-Za-z/!?]/.test(after) ? '\\<' : ch;
        break;
      case '&':
        out += /^&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.test(s.slice(i)) ? '\\&' : ch;
        break;
      case '[':
        // An entity, not `\[`: the render path reads `\[ ... \]` as display math.
        out += st.link || /^\[[^\]]*\](?:\(|\[|:)/.test(s.slice(i)) ? '&#91;' : ch;
        break;
      case ']':
        out += st.link ? '&#93;' : ch;
        break;
      case '|':
        out += st.cell ? '\\|' : ch;
        break;
      default:
        out += ch;
    }
  }
  return out;
}

function escapeProse(s: string, lineStart: boolean, prev: string, st: Inline): string {
  let out = '';
  let cursor = 0;
  RAW_MATH.lastIndex = 0;
  for (let m = RAW_MATH.exec(s); m; m = RAW_MATH.exec(s)) {
    const gap = s.slice(cursor, m.index);
    if (gap) out += escapeRun(gap, lineStart && cursor === 0, out.slice(-1) || prev, st);
    out += st.cell ? tableSafeTex(m[0]) : m[0];
    cursor = m.index + m[0].length;
  }
  const tail = s.slice(cursor);
  if (tail) out += escapeRun(tail, lineStart && cursor === 0, out.slice(-1) || prev, st);
  return out;
}

/** GFM splits a row at every `|`, escaped or not inside math, so bars are spelled as commands. */
function tableSafeTex(tex: string): string {
  return tex.replace(/\\\|/g, '\\Vert ').replace(/\|/g, '\\vert ');
}

function cleanTex(raw: string): { tex: string; display: boolean | null } {
  let tex = raw.replace(/ /g, ' ').trim();
  let display: boolean | null = null;
  const wrapped =
    /^\$\$([\s\S]+)\$\$$/.exec(tex) ?? /^\\\[([\s\S]+)\\\]$/.exec(tex);
  const inlineWrapped = wrapped ? null : /^\$([^$]+)\$$/.exec(tex) ?? /^\\\(([\s\S]+)\\\)$/.exec(tex);
  if (wrapped?.[1]) {
    tex = wrapped[1].trim();
    display = true;
  } else if (inlineWrapped?.[1]) {
    tex = inlineWrapped[1].trim();
    display = false;
  }
  // A blank line would end the Markdown math block; a line that starts with `=` trips the
  // composer dedupe inside prepareMathForRender. Neither newline means anything to TeX.
  tex = tex.replace(/\n\s*\n/g, '\n').replace(/\n[ \t]*(?==)/g, ' ');
  return { tex, display };
}

/** A label is TeX unless it reads as speech ("x squared plus one"). */
function texLike(value: string | null): string | null {
  const t = value?.trim();
  if (!t) return null;
  const words = t.replace(/\\[A-Za-z]+(?:\{[^{}]*\})?/g, ' ').match(/\b[a-z]{3,}\b/g) ?? [];
  return words.length >= 2 ? null : t;
}

/** KaTeX (and MathML in general) stores the source in `annotation[encoding="application/x-tex"]` [katex-copy-tex]. */
function annotationTex(el: Element): string | null {
  const exact = el.querySelector('annotation[encoding="application/x-tex"]');
  if (exact) return exact.textContent ?? '';
  const all = el.querySelectorAll('annotation');
  for (let i = 0; i < all.length; i++) {
    const a = all[i]!;
    if (/tex/i.test(a.getAttribute('encoding') ?? '')) return a.textContent ?? '';
  }
  return null;
}

function mathMlText(el: Element): string {
  let out = '';
  const visit = (node: Node, depth: number): void => {
    if (depth > 64) return;
    if (node.nodeType === TEXT_NODE) {
      out += node.nodeValue ?? '';
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const tag = tagOf(node as Element);
    if (tag === 'annotation' || tag === 'annotation-xml') return;
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c, depth + 1);
  };
  visit(el, 0);
  return out;
}

function firstAttribute(el: Element | null, names: string[]): string | null {
  if (!el) return null;
  for (const name of names) {
    const value = el.getAttribute(name);
    if (value && value.trim()) return value;
  }
  return null;
}

function hasBlockMath(el: Element): boolean {
  return el.querySelector('.katex-display, math[display="block"]') !== null;
}

function readKatex(el: Element, display: boolean): MathSource {
  const tex = annotationTex(el);
  if (tex !== null) return { tex, display };
  // No source left in the page: the MathML text reads in order, the HTML layer is glyph soup.
  const readable = el.querySelector('.katex-mathml') ?? el.querySelector('.katex-html') ?? el;
  return { text: readable.textContent ?? '' };
}

/** MathJax 3/4: `mjx-container`, block when `display="true"`, hidden MathML in `mjx-assistive-mml`. */
function readMathJax(el: Element): MathSource {
  const display = el.getAttribute('display') === 'true' || el.querySelector('math[display="block"]') !== null;
  const tex =
    firstAttribute(el, TEX_ATTRIBUTES) ??
    // v4 copies the TeX input onto the output nodes as data-latex [mathjax-v4].
    firstAttribute(el.querySelector('mjx-math[data-latex], math[data-latex]'), ['data-latex']) ??
    annotationTex(el) ??
    texLike(el.getAttribute('aria-label'));
  if (tex) return { tex, display };
  const assistive = el.querySelector('mjx-assistive-mml math, math');
  return { text: assistive ? mathMlText(assistive) : el.textContent ?? '' };
}

function readMath(el: Element, tag: string): MathSource | 'skip' | null {
  if (tag === 'script') {
    // MathJax 2 keeps the source in <script type="math/tex[; mode=display]"> [mathjax-v2].
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    if (!type.startsWith('math/')) return null;
    if (!type.startsWith('math/tex')) return 'skip';
    return { tex: el.textContent ?? '', display: /mode\s*=\s*display/.test(type) };
  }
  const classes = el.getAttribute('class') ?? '';
  // Gemini: `.math-inline` / `.math-block` carry the source in data-math [voyager formulaSource].
  const dataMath = el.getAttribute('data-math');
  if (dataMath && dataMath.trim()) {
    return { tex: dataMath, display: hasToken(classes, 'math-block') || hasToken(classes, 'math-display') || tag === 'div' };
  }
  // ChatGPT's client-side KaTeX layout drops the MathML annotation and keeps the TeX on a
  // `[role="math"][data-math-source]` wrapper, mirrored in aria-label [voyager formulaSource].
  const source = el.getAttribute('data-math-source');
  if (source && source.trim()) return { tex: source, display: hasToken(classes, 'katex-display') || hasBlockMath(el) };
  if (tag === 'mjx-container') return readMathJax(el);
  if (tag === 'math') {
    const tex = annotationTex(el) ?? texLike(el.getAttribute('alttext'));
    return tex ? { tex, display: el.getAttribute('display') === 'block' } : { text: mathMlText(el) };
  }
  const role = el.getAttribute('role');
  if (!classes && role !== 'math' && tag !== 'ms-katex') return null;

  // `.katex-display` wraps block math; a bare `.katex` is inline unless its MathML says block
  // (Grok block math can lack the wrapper) [katex-copy-tex], [grok-export].
  if (hasToken(classes, 'katex-display')) return readKatex(el, true);
  if (hasToken(classes, 'katex')) return readKatex(el, el.querySelector('math[display="block"]') !== null);
  // A KaTeX parse error shows the raw source as its text.
  if (hasToken(classes, 'katex-error')) return { tex: el.textContent ?? '', display: false };
  if (role === 'math') {
    const tex = annotationTex(el) ?? texLike(el.getAttribute('aria-label'));
    return tex ? { tex, display: hasBlockMath(el) } : null;
  }
  if (MATHJAX2_FRAME.test(classes)) {
    // The typeset frame sits right before its source script; the preview is always redundant.
    if (hasToken(classes, 'MathJax_Preview')) return 'skip';
    const next = el.nextElementSibling;
    if (next && tagOf(next) === 'script' && /^math\/tex/i.test(next.getAttribute('type') ?? '')) return 'skip';
    const tex = firstAttribute(el, TEX_ATTRIBUTES);
    if (tex) return { tex, display: /Display|display/.test(classes) };
    const assistive = el.querySelector('math');
    return { text: assistive ? mathMlText(assistive) : el.textContent ?? '' };
  }
  // AI Studio's <ms-katex> and generic `.math-*` wrappers without data-math [voyager formulaSource].
  if (tag === 'ms-katex' || MATH_WRAPPER_CLASS.test(classes)) {
    const tex = firstAttribute(el, TEX_ATTRIBUTES) ?? annotationTex(el);
    if (tex !== null) {
      return { tex, display: /(?:^|\s)math-(?:block|display)(?:\s|$)/.test(classes) || hasBlockMath(el) };
    }
  }
  return null;
}

function emitMath(source: MathSource, flow: Flow, st: Inline): void {
  if ('text' in source) {
    flow.text(source.text, st);
    return;
  }
  const cleaned = cleanTex(source.tex);
  let tex = cleaned.tex;
  if (!tex) return;
  if (st.cell) tex = tableSafeTex(tex);
  if ((cleaned.display ?? source.display) && !flow.inlineOnly) {
    flow.block(`$$\n${tex}\n$$`);
    return;
  }
  // `$a$$b$` would read as a display delimiter.
  flow.append(`${flow.lastChar === '$' ? ' ' : ''}$${tex.replace(/\s*\n\s*/g, ' ')}$`);
}

function codeText(root: Element): string {
  let out = '';
  const visit = (node: Node, depth: number): void => {
    if (depth > 64) return;
    if (node.nodeType === TEXT_NODE) {
      out += node.nodeValue ?? '';
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const el = node as Element;
    const tag = tagOf(el);
    if (tag === 'br') {
      out += '\n';
      return;
    }
    if (el !== root && safeMatches(el, CODE_SKIP_SELECTOR)) return;
    // Editors that render one block element per line keep no newline text between them.
    const line = el !== root && (tag === 'div' || tag === 'p' || tag === 'li' || tag === 'tr');
    if (line && out && !out.endsWith('\n')) out += '\n';
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c, depth + 1);
    if (line && out && !out.endsWith('\n')) out += '\n';
  };
  visit(root, 0);
  return out.replace(/ /g, ' ').replace(/\r\n?/g, '\n').replace(/^\n/, '').replace(/\n+$/, '');
}

function normalizeLanguage(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t || TOOLBAR_WORDS.has(t) || PLAIN_LANGUAGES.has(t)) return '';
  const alias = LANGUAGE_ALIASES[t] ?? t;
  return /^[a-z0-9_+#.-]{1,24}$/.test(alias) ? alias : '';
}

/** Text in the block that is not code and not a button: the language label, if anything. */
function toolbarLabels(host: Element, code: Element): string[] {
  const labels: string[] = [];
  const visit = (node: Node, depth: number): void => {
    if (depth > 32 || labels.length > 8) return;
    if (node.nodeType === TEXT_NODE) {
      const t = (node.nodeValue ?? '').trim();
      if (t) labels.push(t);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE || node === code) return;
    const el = node as Element;
    if (el !== host && safeMatches(el, 'button, [role="button"], svg, mat-icon, style, script')) return;
    for (let c = node.firstChild; c; c = c.nextSibling) visit(c, depth + 1);
  };
  visit(host, 0);
  return labels;
}

function languageOf(host: Element, code: Element): string {
  for (let el: Element | null = code; el; el = el.parentElement) {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/);
    for (const token of classes) {
      const m = /^(?:language|lang)-(.+)$/i.exec(token);
      if (m?.[1]) return normalizeLanguage(m[1]);
    }
    const attr = el.getAttribute('data-language') ?? el.getAttribute('data-lang');
    if (attr) return normalizeLanguage(attr);
    if (el === host) break;
  }
  for (const label of toolbarLabels(host, code)) {
    const lang = normalizeLanguage(label);
    if (lang) return lang;
  }
  return '';
}

function readCodeHost(host: Element, preHint?: Element): CodeBlock | null {
  const pre = preHint ?? (tagOf(host) === 'pre' ? host : host.querySelector('pre'));
  const scope = pre ?? host;
  const codes: Element[] = [];
  const found = scope.querySelectorAll('code');
  for (let i = 0; i < found.length; i++) {
    const c = found[i]!;
    if (!c.closest('[data-markdown-copy="exclude"]')) codes.push(c);
  }
  let codeEl: Element | null = null;
  if (tagOf(host) === 'code') codeEl = host;
  else if (codes.length === 1) codeEl = codes[0]!;
  else if (pre) codeEl = pre;
  else {
    for (const c of codes) {
      if (!codeEl || (c.textContent?.length ?? 0) > (codeEl.textContent?.length ?? 0)) codeEl = c;
    }
  }
  // Grok mounts a code block's text only once it scrolls into view [grok-export]; nothing to show.
  if (!codeEl) return null;
  const code = codeText(codeEl);
  return code.trim() ? { lang: languageOf(host, codeEl), code } : null;
}

/**
 * A wrapper belongs to the code block when everything in it besides the code is toolbar: no prose
 * elements, little text, and a button or a code-ish class as evidence. Claude's block is a div
 * holding a Copy button, a language label div and the <pre> wrapper.
 */
function isToolbarWrapper(parent: Element, inner: Element): boolean {
  let text = 0;
  let evidence = /code|highlight|shiki|hljs/i.test(parent.getAttribute('class') ?? '');
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child === inner) continue;
    if (child.nodeType === TEXT_NODE) {
      text += (child.nodeValue ?? '').trim().length;
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = tagOf(el);
    if (WRAPPER_CONTENT_TAGS.has(tag) || el.querySelector(WRAPPER_CONTENT_SELECTOR)) return false;
    if (tag === 'button' || el.querySelector('button, [role="button"]')) evidence = true;
    text += (el.textContent ?? '').trim().length;
  }
  return text === 0 || (evidence && text <= 80);
}

function registeredAncestor(el: Element, root: Element, hosts: Map<Element, CodeBlock | null>): boolean {
  for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
    if (hosts.has(node)) return true;
    if (node === root) break;
  }
  return false;
}

/**
 * Code blocks are resolved before the walk: the language label precedes the code in document
 * order, so a top-down walk would already have emitted "python" as prose when it reaches the <pre>.
 */
function findCodeHosts(root: Element): Map<Element, CodeBlock | null> {
  const hosts = new Map<Element, CodeBlock | null>();
  if (tagOf(root) === 'pre' || safeMatches(root, KNOWN_CODE_HOSTS)) {
    hosts.set(root, readCodeHost(root));
    return hosts;
  }
  const known = root.querySelectorAll(KNOWN_CODE_HOSTS);
  for (let i = 0; i < known.length; i++) {
    const host = known[i]!;
    if (!registeredAncestor(host, root, hosts)) hosts.set(host, readCodeHost(host));
  }
  const pres = root.querySelectorAll('pre');
  for (let i = 0; i < pres.length; i++) {
    const pre = pres[i]!;
    if (hosts.has(pre) || registeredAncestor(pre, root, hosts)) continue;
    let host: Element = pre;
    for (let hop = 0; hop < 6; hop++) {
      const parent: Element | null = host.parentElement;
      if (!parent || parent === root || !isToolbarWrapper(parent, host)) break;
      host = parent;
    }
    hosts.set(host, readCodeHost(host, pre));
  }
  return hosts;
}

function fence(block: CodeBlock): string {
  let longest = 0;
  for (const run of block.code.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${block.lang}\n${block.code}\n${ticks}`;
}

function inlineCode(text: string, st: Inline): string {
  let body = text.replace(/\s*\n\s*/g, ' ');
  if (!body.trim()) return '';
  if (st.cell) body = body.replace(/\|/g, '\\|');
  let longest = 0;
  for (const run of body.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  const ticks = '`'.repeat(longest + 1);
  const pad = body.startsWith('`') || body.endsWith('`') ? ' ' : '';
  return `${ticks}${pad}${body}${pad}${ticks}`;
}

function nextVisibleChar(el: Element): string {
  for (let n = el.nextSibling; n; n = n.nextSibling) {
    const t = n.nodeType === TEXT_NODE ? n.nodeValue ?? '' : n.nodeType === ELEMENT_NODE ? n.textContent ?? '' : '';
    if (t) return t[0]!;
  }
  return '';
}

function isChrome(el: Element, tag: string): boolean {
  if (CHROME_TAGS.has(tag)) return true;
  const style = el.getAttribute('style');
  if (style && /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return true;
  return safeMatches(el, CHROME_SELECTOR);
}

/** A superscript that points at a source, not an exponent. */
function isCitationMark(el: Element): boolean {
  if (el.querySelector('a, button')) return true;
  if (el.hasAttribute('data-turn-source-index')) return true;
  if (/footnote|source|reference|superscript/i.test(el.getAttribute('class') ?? '')) return true;
  return /^\s*\[\d{1,3}\]\s*$/.test(el.textContent ?? '');
}

function inlineOf(el: Element, st: Inline, budget: Budget, depth: number): string {
  const sub = new Flow(budget, true);
  walkChildren(el, sub, st, budget, depth + 1);
  return sub.inline();
}

/**
 * CommonMark only closes `**` when it is right-flanking: `**注意：**这是` and `a**(b)**c` stay
 * literal asterisks. Edge punctuation moves outside the marker in exactly those positions.
 */
function emitWrapped(el: Element, marker: string, flow: Flow, st: Inline, budget: Budget, depth: number): void {
  const raw = inlineOf(el, st, budget, depth);
  const lead = raw.startsWith(' ') ? ' ' : '';
  const trail = raw.endsWith(' ') && raw.trim() ? ' ' : '';
  let inner = raw.trim();
  if (!inner) {
    if (lead) flow.append(' ');
    return;
  }
  let before = '';
  let after = '';
  const prev = lead ? ' ' : flow.lastChar;
  const next = trail ? ' ' : nextVisibleChar(el);
  if (prev && WORD_CHAR.test(prev)) {
    const m = OPENING_PUNCTUATION.exec(inner);
    if (m) {
      before = m[0];
      inner = inner.slice(m[0].length);
    }
  }
  if (next && WORD_CHAR.test(next) && !/&#?\w+;$/.test(inner)) {
    const m = CLOSING_PUNCTUATION.exec(inner);
    if (m) {
      after = m[0];
      inner = inner.slice(0, inner.length - m[0].length);
    }
  }
  flow.append(inner ? `${lead}${before}${marker}${inner}${marker}${after}${trail}` : `${lead}${before}${after}${trail}`);
}

function intAttribute(el: Element, name: string): number | null {
  const raw = el.getAttribute(name);
  if (raw === null || !/^-?\d{1,9}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function checkboxOf(li: Element): Element | null {
  let first: Element | null = li.firstElementChild;
  for (let hop = 0; first && hop < 2 && (tagOf(first) === 'p' || tagOf(first) === 'label'); hop++) {
    first = first.firstElementChild;
  }
  return first && tagOf(first) === 'input' && (first.getAttribute('type') ?? '').toLowerCase() === 'checkbox' ? first : null;
}

function indentContinuation(text: string, indent: string): string {
  return text.split('\n').map((line, i) => (i === 0 || !line ? line : indent + line)).join('\n');
}

function renderList(list: Element, tag: string, st: Inline, budget: Budget, depth: number): string {
  const ordered = tag === 'ol';
  let number = ordered ? intAttribute(list, 'start') ?? 1 : 0;
  const items: Array<Array<{ md: string; kind: BlockKind }>> = [];
  let loose = false;
  for (let child = list.firstElementChild; child; child = child.nextElementSibling) {
    if (budget.spent) break;
    const childTag = tagOf(child);
    if (isChrome(child, childTag)) continue;
    const sub = new Flow(budget);
    if (childTag !== 'li') {
      // A list nested without its <li> belongs to the item above it.
      walkNode(child, sub, st, budget, depth + 1);
      sub.flush();
      const previous = items[items.length - 1];
      if (previous) previous.push(...sub.blocks);
      else if (sub.blocks.length) items.push([{ md: '', kind: 'text' }, ...sub.blocks]);
      continue;
    }
    if (ordered) number = intAttribute(child, 'value') ?? number;
    const box = checkboxOf(child);
    walkChildren(child, sub, st, budget, depth + 1);
    sub.flush();
    for (let c = child.firstElementChild; c; c = c.nextElementSibling) {
      if (tagOf(c) === 'p') loose = true;
    }
    const blocks = sub.blocks.slice();
    if (box) {
      const mark = box.hasAttribute('checked') || (box as HTMLInputElement).checked ? '[x] ' : '[ ] ';
      if (blocks[0]?.kind === 'text') blocks[0] = { md: mark + blocks[0].md, kind: 'text' };
      else blocks.unshift({ md: mark.trim(), kind: 'text' });
    }
    const marker = ordered ? `${number}. ` : '- ';
    if (ordered) number += 1;
    items.push([{ md: marker, kind: 'other' }, ...blocks]);
  }
  const rendered = items.map((parts) => {
    const marker = parts[0]?.md || '- ';
    const blocks = parts.slice(1);
    let body = '';
    blocks.forEach((block, i) => {
      if (i > 0) body += !loose && block.kind === 'list' ? '\n' : '\n\n';
      body += block.md;
    });
    return body ? marker + indentContinuation(body, ' '.repeat(marker.length)) : marker.trimEnd();
  });
  return rendered.join(loose ? '\n\n' : '\n');
}

function cellAlignment(cell: Element): string {
  const align = (cell.getAttribute('align') ?? /text-align\s*:\s*(left|right|center)/i.exec(cell.getAttribute('style') ?? '')?.[1] ?? '').toLowerCase();
  if (align === 'center') return ':-:';
  if (align === 'right') return '--:';
  if (align === 'left') return ':--';
  return '---';
}

function renderTable(table: Element, st: Inline, budget: Budget, depth: number): string {
  const rows: string[][] = [];
  let aligns: string[] = [];
  let caption = '';
  const all = table.querySelectorAll('tr');
  const cellState = { ...st, cell: true };
  for (let r = 0; r < all.length && !budget.spent; r++) {
    const row = all[r]!;
    if (row.closest('table') !== table) continue;
    const cells: string[] = [];
    const rowAligns: string[] = [];
    for (let cell = row.firstElementChild; cell; cell = cell.nextElementSibling) {
      const cellTag = tagOf(cell);
      if (cellTag !== 'td' && cellTag !== 'th') continue;
      cells.push(inlineOf(cell, cellState, budget, depth).replace(/\s+/g, ' ').trim());
      rowAligns.push(cellAlignment(cell));
      const span = Math.min(intAttribute(cell, 'colspan') ?? 1, 32);
      for (let extra = 1; extra < span; extra++) {
        cells.push('');
        rowAligns.push('---');
      }
    }
    if (!cells.length) continue;
    if (!rows.length) aligns = rowAligns;
    rows.push(cells);
  }
  const captionEl = table.querySelector('caption');
  if (captionEl && captionEl.closest('table') === table) caption = inlineOf(captionEl, st, budget, depth).trim();
  if (!rows.length) return caption;
  const width = rows.reduce((w, row) => Math.max(w, row.length), 0);
  const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
  const out = [line(rows[0]!), line(Array.from({ length: width }, (_, i) => aligns[i] ?? '---'))];
  for (const row of rows.slice(1)) out.push(line(row));
  return (caption ? `${caption}\n\n` : '') + out.join('\n');
}

function walkChildren(parent: Node, flow: Flow, st: Inline, budget: Budget, depth: number): void {
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (budget.spent) return;
    walkNode(child, flow, st, budget, depth);
  }
}

function walkNode(node: Node, flow: Flow, st: Inline, budget: Budget, depth: number, isRoot = false): void {
  if (++budget.nodes > MAX_NODES) {
    budget.spent = true;
    return;
  }
  if (node.nodeType === TEXT_NODE) {
    flow.text(node.nodeValue ?? '', st);
    return;
  }
  if (node.nodeType !== ELEMENT_NODE || depth > MAX_DEPTH) return;
  const el = node as Element;
  const tag = tagOf(el);

  const math = readMath(el, tag);
  if (math === 'skip') return;
  if (math) {
    emitMath(math, flow, st);
    return;
  }
  if (!isRoot && isChrome(el, tag)) return;

  const code = budget.codeHosts.get(el);
  if (code !== undefined) {
    if (code) flow.block(fence(code));
    return;
  }

  const level = /^h([1-6])$/.exec(tag)?.[1] ?? (el.getAttribute('role') === 'heading' ? el.getAttribute('aria-level') : null);
  if (level && /^[1-6]$/.test(level)) {
    const text = inlineOf(el, st, budget, depth).trim();
    if (text) flow.block(`${'#'.repeat(Number(level))} ${text}`);
    return;
  }

  switch (tag) {
    case 'br':
      flow.breakLine();
      return;
    case 'hr':
      flow.block('---');
      return;
    case 'strong':
    case 'b':
      if (st.bold) walkChildren(el, flow, st, budget, depth + 1);
      else emitWrapped(el, '**', flow, { ...st, bold: true }, budget, depth);
      return;
    case 'em':
    case 'i':
      if (st.italic) walkChildren(el, flow, st, budget, depth + 1);
      else emitWrapped(el, '*', flow, { ...st, italic: true }, budget, depth);
      return;
    case 'del':
    case 's':
    case 'strike':
      if (st.strike) walkChildren(el, flow, st, budget, depth + 1);
      else emitWrapped(el, '~~', flow, { ...st, strike: true }, budget, depth);
      return;
    case 'code':
    case 'kbd':
    case 'samp':
    case 'tt': {
      const text = el.textContent ?? '';
      // A multi-line <code> outside <pre> is a block some host rendered without one.
      if (tag === 'code' && /\n/.test(text.trim()) && !flow.inlineOnly) {
        const block = readCodeHost(el);
        if (block) flow.block(fence(block));
        return;
      }
      flow.append(inlineCode(text, st));
      return;
    }
    case 'a': {
      const raw = inlineOf(el, { ...st, link: true }, budget, depth);
      const label = raw.trim();
      if (!label) return;
      const href = (el.getAttribute('href') ?? '').trim();
      if (st.link || !/^https?:\/\//i.test(href)) {
        flow.append(raw);
        return;
      }
      const url = href.replace(/[\s<>()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
      const lead = raw.startsWith(' ') ? ' ' : '';
      const trail = raw.endsWith(' ') ? ' ' : '';
      flow.append((el.textContent ?? '').trim() === href ? `${lead}<${url}>${trail}` : `${lead}[${label}](${url})${trail}`);
      return;
    }
    case 'img': {
      const alt = (el.getAttribute('alt') ?? '').trim();
      if (alt && el.getAttribute('role') !== 'presentation') flow.text(alt, st);
      return;
    }
    case 'sup':
    case 'sub': {
      if (tag === 'sup' && isCitationMark(el)) return;
      const inner = inlineOf(el, st, budget, depth).trim();
      if (!inner) return;
      const mark = tag === 'sup' ? '^' : '_';
      flow.append(/^[A-Za-z0-9]$/.test(inner) ? mark + inner : `${mark}{${inner}}`);
      return;
    }
    case 'ul':
    case 'ol':
    case 'menu':
      flow.block(renderList(el, tag, st, budget, depth), 'list');
      return;
    case 'table':
      flow.block(renderTable(el, st, budget, depth));
      return;
    case 'blockquote': {
      const sub = new Flow(budget);
      walkChildren(el, sub, st, budget, depth + 1);
      sub.flush();
      const body = sub.blocks.map((b) => b.md).join('\n\n');
      if (body) flow.block(body.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n'));
      return;
    }
    case 'pre': {
      const block = readCodeHost(el);
      if (block) flow.block(fence(block));
      return;
    }
    case 'summary':
      return;
    case 'details': {
      // A closed block is not on screen; a reasoning block ("Thought for 12s") is not the answer.
      let label = '';
      for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (tagOf(c) === 'summary') label = c.textContent ?? '';
      }
      if (!el.hasAttribute('open') || REASONING_LABEL.test(label)) return;
      flow.flush();
      walkChildren(el, flow, st, budget, depth + 1);
      flow.flush();
      return;
    }
    case 'dt': {
      const text = inlineOf(el, { ...st, bold: true }, budget, depth).trim();
      if (text) flow.block(`**${text}**`, 'text');
      return;
    }
    default:
      break;
  }

  if (BLOCK_TAGS.has(tag)) {
    flow.flush();
    walkChildren(el, flow, st, budget, depth + 1);
    flow.flush();
    return;
  }
  walkChildren(el, flow, st, budget, depth + 1);
}

/** Rendered assistant message element -> Markdown with LaTeX restored. Reads only; never throws. */
export function messageToMarkdown(message: Element): string {
  const budget: Budget = { nodes: 0, chars: 0, spent: false, codeHosts: new Map() };
  const flow = new Flow(budget);
  try {
    if (!message || message.nodeType !== ELEMENT_NODE) return '';
    budget.codeHosts = findCodeHosts(message);
    walkNode(message, flow, PLAIN, budget, 0, true);
    flow.flush();
  } catch {
    // Whatever was read before the page surprised us is still the start of the answer.
  }
  let out = '';
  for (const block of flow.blocks) {
    const next = out ? `${out}\n\n${block.md}` : block.md;
    if (next.length > MAX_MARKDOWN_CHARS) break;
    out = next;
  }
  return out;
}
