/**
 * Normalize text read from Gemini's Quill composer.
 *
 * Rich editors often duplicate math: innerText yields both the rendered glyph
 * (Vs=48) and the underlying LaTeX (V_s = 48) concatenated on one line.
 */

/**
 * Remove compact assignments immediately before their subscript LaTeX twin.
 *
 * A compact form is a duplicate only when it names the SAME symbol as the
 * subscripted form that follows (`Vs=48` before `V_s`). Without that identity
 * check the pattern deletes ordinary math: `L=(n_2-n_1)d` loses ` L=(`.
 */
function stripCompactBeforeSubscript(text: string): string {
  // Start at a token boundary: otherwise a long identifier without '=' is
  // scanned again from every suffix, blocking the provider's main thread.
  return text.replace(
    /\b([A-Za-z])([A-Za-z0-9]+)=([^\s_=]+(?:[ \t]*[ΩΩ])?)(?=\1_(?:\{\2\}|\2)\s*=)/g,
    (match: string, _letter: string, _subscript: string, value: string, offset: number) => {
      const twin = text.slice(offset + match.length).replace(/^[^=]+=/, '');
      const compact = (s: string) => s.replace(/\\Omega/g, 'Ω').replace(/[\\_{}\s,]/g, '');
      const expected = compact(value);
      const actual = compact(twin);
      return actual.startsWith(expected) && !(/\d$/.test(expected) && /^\d/.test(actual.slice(expected.length)))
        ? '' : match;
    },
  );
}

/**
 * Drop a trailing compact repeat after a subscript assignment was kept —
 * again only when both name the same symbol, so a second, unrelated
 * assignment (`R_1 = 2 and V=12`) is never deleted.
 */
function stripTrailingCompactRepeat(text: string): string {
  return text.replace(
    /([A-Za-z])(_\{?[A-Za-z0-9]+\}?\s*=\s*[^,;.\n=_]+?)\s+\1[A-Za-z0-9]*=[^,;.\n=_]+/g,
    '$1$2',
  );
}

/** Merge lines broken when each symbol was its own block (Vs / =48 V). */
function collapseSpuriousLineBreaks(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return text;

  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = lines[i + 1];
    if (/^[A-Za-z]_?\{?[A-Za-z0-9]+\}?$/.test(line) && next?.startsWith('=')) {
      merged.push(`${line}${next}`);
      i++;
      continue;
    }
    if (/^=\s*.+/.test(line) && merged.length > 0) {
      const prev = merged[merged.length - 1]!;
      if (/^[A-Za-z]_?\{?[A-Za-z0-9]+\}?$/.test(prev)) {
        merged[merged.length - 1] = `${prev}${line}`;
        continue;
      }
    }
    if (
      merged.length > 0 &&
      !/[.!?]$/.test(merged[merged.length - 1]!) &&
      /^[a-z]/.test(line)
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${line}`;
      continue;
    }
    merged.push(line);
  }
  return merged.join('\n');
}

function needsLineBreakCollapse(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.some(
    (line, i) =>
      (/^[A-Za-z]_?\{?[A-Za-z0-9]+\}?$/.test(line) && lines[i + 1]?.startsWith('=')) ||
      (/^=\s/.test(line) && i > 0),
  );
}

/** Light cleanup for plain-text math tokens left after deduplication. */
function normalizePlainMathTokens(text: string): string {
  return text
    .replace(/\\?\s*\\Omega/g, 'Ω')
    .replace(/\\,\s*/g, ' ')
    .replace(/[^\S\n]{2,}/g, ' ');
}

/** Dedupe only — safe inside $...$ math blocks (no \\Omega → Ω rewrite). */
export function dedupeComposerMath(text: string): string {
  if (!text.trim()) return '';
  let t = text.replace(/\r\n/g, '\n');
  t = stripTrailingCompactRepeat(stripCompactBeforeSubscript(t));
  if (needsLineBreakCollapse(t)) {
    t = collapseSpuriousLineBreaks(t);
  }
  return t.trim();
}

/**
 * Collapse Quill/Gemini duplicate math expressions in pasted question text.
 * Idempotent — safe to run on already-clean strings.
 */
export function normalizeComposerText(text: string): string {
  if (!text.trim()) return '';
  let t = dedupeComposerMath(text);
  t = normalizePlainMathTokens(t);
  return t.trim();
}

function isHiddenForExtraction(el: HTMLElement): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.classList.contains('katex-html')) return true;
  const style = el.style;
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  return false;
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/** True when innerText glues a compact assignment to its subscript twin (Vs=48V_s). */
export function hasComposerMathDuplicates(text: string): boolean {
  return /\b[A-Za-z][A-Za-z0-9]*=[^\s_=\n]+[A-Za-z]_/.test(text);
}

function readInlineNodes(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (parent && isHiddenForExtraction(parent)) return '';
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  if (isHiddenForExtraction(el)) return '';

  const dataVal = el.getAttribute('data-value') ?? el.getAttribute('data-latex');
  if (dataVal && !el.querySelector('[data-value],[data-latex]')) return dataVal;

  let out = '';
  for (const child of el.childNodes) out += readInlineNodes(child);
  return out;
}

/**
 * Read contenteditable text without KaTeX / Quill duplicate layers.
 * Preserves paragraph breaks from block elements.
 */
export function extractContentEditableText(root: HTMLElement): string {
  const blockLines: string[] = [];
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent ?? '').trim();
      if (t) blockLines.push(t);
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (BLOCK_TAGS.has(el.tagName)) {
        blockLines.push(readInlineNodes(el));
      } else {
        const inline = readInlineNodes(el).trim();
        if (inline) blockLines.push(inline);
      }
    }
  }
  if (blockLines.length > 0) return blockLines.join('\n');

  const inline = readInlineNodes(root);
  if (inline.trim()) return inline;
  return root.innerText ?? root.textContent ?? '';
}

function collectLeadingTextNodes(el: HTMLElement): string {
  const parts: string[] = [];
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent ?? '').trim();
      if (t) parts.push(t);
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) break;
  }
  return parts.join(' ');
}

/** Prefer innerText unless Quill duplicated math tokens in the string. */
export function readComposerText(el: HTMLElement): string {
  const leading = collectLeadingTextNodes(el);
  const inner = el.innerText ?? el.textContent ?? '';
  const core = hasComposerMathDuplicates(inner)
    ? extractContentEditableText(el)
    : inner;
  if (leading && core && !core.startsWith(leading)) {
    return `${leading}\n\n${core}`;
  }
  return core.trim() ? core : inner;
}
