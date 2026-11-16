/**
 * Text that foreign notations carry inside labels: character entities, a little HTML, inline Markdown.
 * Labels are data. These passes change notation only (an entity to its character, a line break to a
 * space, a subscript tag to the native `_{}`), never wording.
 */
import { labelText, refuse } from './native';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  le: '≤', ge: '≥', ne: '≠', times: '×', divide: '÷', plusmn: '±', minus: '−', middot: '·', deg: '°', micro: 'µ',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', lArr: '⇐', rArr: '⇒', hArr: '⇔',
  infin: '∞', sum: '∑', prod: '∏', radic: '√', asymp: '≈', equiv: '≡', part: '∂', nabla: '∇', isin: '∈', notin: '∉',
  cap: '∩', cup: '∪', sub: '⊂', sup: '⊃', sube: '⊆', supe: '⊇', and: '∧', or: '∨', not: '¬', forall: '∀', exist: '∃',
  empty: '∅', int: '∫', prop: '∝', ang: '∠', there4: '∴', perp: '⊥', oplus: '⊕', otimes: '⊗',
  hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•',
  copy: '©', reg: '®', trade: '™', frac12: '½', frac14: '¼', frac34: '¾', sup2: '²', sup3: '³', check: '✓',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι',
  kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

/** Printable Unicode only: a control character or a lone surrogate is not label text. */
function codePoint(value: number): string | null {
  if (!Number.isInteger(value) || value < 32 || value === 127 || value > 0x10ffff) return null;
  if (value >= 0xd800 && value <= 0xdfff) return null;
  return String.fromCodePoint(value);
}

function entity(body: string): string | null {
  if (body.startsWith('#')) {
    const hex = /^#x/i.test(body);
    return codePoint(Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10));
  }
  if (/^\d/.test(body)) return codePoint(Number.parseInt(body, 10));
  const exact = Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : undefined;
  if (exact !== undefined) return exact;
  const folded = body.toLowerCase();
  return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, folded) ? NAMED_ENTITIES[folded]! : null;
}

/**
 * `&amp;`, `&#35;`, `&#x23;`; with `mermaidCodes` also Mermaid's own `#quot;` and `#35;`.
 * One pass, so decoded text is never decoded again. An unknown entity stays as written.
 */
export function decodeEntities(text: string, mermaidCodes = false): string {
  if (!text.includes(';')) return text;
  return text.replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,15});|#(\d{1,7}|[a-z][a-z0-9]{1,15});/gi,
    (whole: string, html: string | undefined, mermaid: string | undefined) => {
      if (html !== undefined) return entity(html) ?? whole;
      return mermaidCodes && mermaid !== undefined ? entity(mermaid) ?? whole : whole;
    },
  );
}

const ATTRIBUTES = String.raw`(?:\s+[a-z-]+\s*=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s"'<>]+))*\s*\/?>`;
/** Tags that only style their text. Attributes must look like attributes, so `a<b and c>d` stays text. */
const FORMAT_TAG = new RegExp(String.raw`<\/?(?:b|i|u|s|em|strong|span|div|p|font|small|big|code|tt|center|mark)${ATTRIBUTES}`, 'gi');
/** Tags whose content is structure (an image, a table, a link target) that a one-line label cannot hold. */
const STRUCTURAL_TAG = new RegExp(String.raw`<\/?(?:img|table|tr|td|th|svg|iframe|a|ul|ol|li|hr|input|button)(?:\s[^<>]*)?\/?>`, 'i');

/** Label HTML to label text: a break is a space, sub/superscripts become the native `_{}` / `^{}`, styling goes. */
export function flattenHtml(text: string): string {
  if (!text.includes('<')) return text;
  if (STRUCTURAL_TAG.test(text)) refuse('a label holds HTML structure that has no plain-text form');
  return text
    .replace(/<\/?br\s*\/?>/gi, ' ')
    .replace(FORMAT_TAG, '')
    .replace(/<(sub|sup)\s*>([^<>]*)<\/\1\s*>/gi, (_whole, tag: string, inner: string) => `${tag.toLowerCase() === 'sub' ? '_' : '^'}{${inner.trim()}}`);
}

export interface TextSegment {
  text: string;
  math: boolean;
}

/** `$…$` spans by the usual rule: no space just inside the delimiters, no digit after the closing one. */
const MATH_SPAN = /\$(?!\s)[^$\n]+?(?<![\s\\])\$(?!\d)/g;

/** Split text into math spans (kept verbatim by every pass) and the prose between them. */
export function splitMath(text: string): TextSegment[] {
  if (!text.includes('$')) return [{ text, math: false }];
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(MATH_SPAN)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), math: false });
    segments.push({ text: match[0], math: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), math: false });
  return segments;
}

const LINK = /\[([^\]\n]{1,200})\]\((?:https?:\/\/|mailto:|www\.|\/|#)[^)\s]{0,500}(?:\s+"[^"\n]{0,200}")?\)/g;
/** Emphasis only where a renderer would certainly emphasise: delimiters flush to the words, not inside one (`a*b*c`, snake_case). */
const STAR_EMPHASIS = /(?<![\p{L}\p{N}*\\])(\*{1,3})(?=[^\s*])([^*\n]{1,200}?)(?<=[^\s*])\1(?![\p{L}\p{N}*])/gu;
const UNDERSCORE_EMPHASIS = /(?<![\p{L}\p{N}_\\])(_{1,3})(?=[^\s_])([^_\n]{1,200}?)(?<=[^\s_])\1(?![\p{L}\p{N}_])/gu;

function stripProse(text: string): string {
  if (/!\[[^\]\n]*\]\(/.test(text)) refuse('an image has no plain-text form');
  return text
    .replace(LINK, '$1')
    .replace(/`([^`\n]+)`/g, (_whole, code: string) => code.trim())
    .replace(STAR_EMPHASIS, '$2')
    .replace(UNDERSCORE_EMPHASIS, '$2')
    .replace(/\\([*_`[\]~#])/g, '$1');
}

/** Inline Markdown to its text: emphasis markers, code ticks and link targets go; math spans are untouched. */
export function stripInlineMarkdown(text: string): string {
  return splitMath(text).map((segment) => (segment.math ? segment.text : stripProse(segment.text))).join('');
}

/**
 * Mermaid label text. Quotes delimit a label, a back-ticked label is a Markdown string, `<br/>` and a
 * written `\n` break the line (the native engines wrap by themselves, so a break is a space).
 * `\n` followed by a lowercase letter is left alone: it is far more often `\nu` or `\neq`.
 */
export function mermaidLabel(raw: string): string {
  let text = raw.trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"') && !text.slice(1, -1).includes('"')) text = text.slice(1, -1).trim();
  if (text.length >= 2 && text.startsWith('`') && text.endsWith('`')) text = stripInlineMarkdown(text.slice(1, -1));
  return labelText(decodeEntities(flattenHtml(text).replace(/\\n(?![a-z])/g, ' '), true));
}
