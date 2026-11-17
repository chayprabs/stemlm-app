/**
 * Adapter factory + shared DOM helpers.
 *
 * Hosts differ in selectors; attach/insert/capsule behaviour is shared.
 * Fragile, frequently-changing bits live in each host's config file.
 */
import type { AdapterConfig, PlatformAdapter } from './types';
import { COMPOSER_SLOT_SELECTOR } from '@/src/lib/composer-slot';
import { COMPOSER_ATTACHMENT_SELECTORS } from '@/src/lib/file-inject';
import { normalizeComposerText, readComposerText } from '@/src/lib/composer-text';
import { STUDY_GUIDE_REFERENCE } from '@/src/lib/study-guide';
import { isCapsuleEndLine } from '@/src/protocol/capsule-boundary';

const STEMLM_CODE_SELECTORS = [
  'pre code.language-stemlm',
  'pre code[class*="language-stemlm"]',
  'pre code',
  'pre',
];

function hasEndToken(text: string): boolean {
  return text.split('\n').some(isCapsuleEndLine);
}

function firstMatch(selectors: string[], root: ParentNode = document): HTMLElement | null {
  for (const sel of selectors) {
    try {
      if (root instanceof HTMLElement && root.matches(sel)) return root;
      const el = root.querySelector<HTMLElement>(`:scope ${sel}, ${sel}`);
      if (el) return el;
    } catch {
      /* invalid selector — skip */
    }
  }
  return null;
}

function allMatches(selectors: string[], root: ParentNode = document): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<Element>();
  for (const sel of selectors) {
    try {
      root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          out.push(el);
        }
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Keep only the innermost elements (drop any that contain another match). */
function innermost(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter((el) => !elements.some((other) => other !== el && el.contains(other)));
}

const USER_MESSAGE_SELECTOR = '[data-testid*="user" i], [data-message-author-role="user"], [data-role="user"]';

/**
 * Assistant messages in page order. A generic selector (".message-bubble") can also match the
 * student's own message, which is never a reply; selector order is not page order.
 */
function assistantBlocks(selectors: string[]): HTMLElement[] {
  return innermost(allMatches(selectors))
    .filter((el) => !el.closest(USER_MESSAGE_SELECTOR))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

/**
 * The student's own turns on the four hosts, behind each host's own `userMessage` config. Kept
 * apart from USER_MESSAGE_SELECTOR on purpose: that one decides what counts as a reply and was
 * tuned on the live sites, while this list only ever finds the question an answer belongs to.
 */
const USER_TURN_FALLBACKS = [
  '[data-message-author-role="user"]',
  '[data-message-role="user"]',
  '[data-testid="user-message"]',
  'user-query',
  '[data-role="user"]',
];
/** Parts of a user turn the student did not type: controls, screen-reader labels, file chips. */
const USER_TURN_CHROME = [
  'button',
  '[role="button"]',
  'svg',
  'style',
  'script',
  '[aria-hidden="true"]',
  '.sr-only',
  '.cdk-visually-hidden',
  'user-query-file-preview',
  '[data-testid*="file" i]',
  '[data-testid*="attachment" i]',
  '[class*="file-preview" i]',
  '[class*="attachment" i]',
].join(', ');
const USER_TURN_LINE_TAGS = new Set(['P', 'DIV', 'LI', 'BR', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
/** A question is a few lines; a pasted document is cut rather than carried into every session. */
const USER_QUESTION_MAX_CHARS = 4_000;

function collectTypedText(node: Node, out: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(node.textContent ?? '');
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  try {
    if (node.matches(USER_TURN_CHROME)) return;
  } catch {
    return;
  }
  const line = USER_TURN_LINE_TAGS.has(node.tagName);
  if (line) out.push('\n');
  for (const child of node.childNodes) collectTypedText(child, out);
  if (line) out.push('\n');
}

/** What the student typed in `el`, one line per block, without the turn's chrome. */
function typedText(el: HTMLElement): string {
  const out: string[] = [];
  collectTypedText(el, out);
  return out
    .join('')
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Text of the nearest user turn before `block` in page order, or '' when no turn is recognised.
 * A turn that contains the block is a conversation wrapper, not the question.
 */
function userQuestionBefore(block: Element, turnSelectors: string[], textSelectors: string[]): string {
  let nearest: HTMLElement | null = null;
  for (const turn of allMatches(turnSelectors)) {
    if (turn.contains(block) || !(turn.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (!nearest || nearest.compareDocumentPosition(turn) & Node.DOCUMENT_POSITION_FOLLOWING) nearest = turn;
  }
  if (!nearest) return '';
  let text = '';
  for (const sel of textSelectors) {
    text = innermost(allMatches([sel], nearest)).map(typedText).filter(Boolean).join('\n');
    if (text) break;
  }
  return (text || typedText(nearest)).slice(0, USER_QUESTION_MAX_CHARS);
}

function outsideComposerSlot(el: HTMLElement | null): HTMLElement | null {
  if (!el?.isConnected) return null;
  if (el.closest(COMPOSER_SLOT_SELECTOR)) return null;
  return el;
}

function isHiddenComposerNode(el: HTMLElement): boolean {
  if (el.hidden) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  try {
    let node: HTMLElement | null = el;
    for (let i = 0; i < 10 && node && node !== document.body && node !== document.documentElement; i++) {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('inert')) return true;
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      node = node.parentElement;
    }
  } catch {
    /* getComputedStyle can throw on detached nodes */
  }
  return false;
}

/** Prefer the actual host + / attach control, never an inner SVG/icon. */
function climbToHostControl(el: HTMLElement): HTMLElement {
  const control = el.closest('button, [role="button"], [aria-haspopup]') as HTMLElement | null;
  if (control && !control.closest(COMPOSER_SLOT_SELECTOR)) return control;
  return el;
}

function sharesComposer(el: HTMLElement, editor: HTMLElement | null, shell: HTMLElement | null): boolean {
  if (shell?.contains(el)) return true;
  if (!editor) return true;
  if (shell?.contains(editor) && shell.contains(el)) return true;
  let node: HTMLElement | null = editor;
  for (let i = 0; i < 8 && node && node !== document.body; i++) {
    if (node.contains(el)) return true;
    node = node.parentElement;
  }
  return false;
}

function hasBox(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/**
 * First match that is not inside the stemLM inject slot (avoids our own button). Among the matches
 * of one selector a laid-out one wins: after an in-app new chat ChatGPT keeps the old thread's
 * composer in the DOM at zero size, ahead of the live one.
 */
function firstMatchOutsideSlot(selectors: string[], root: ParentNode = document): HTMLElement | null {
  for (const sel of selectors) {
    try {
      if (root instanceof HTMLElement && root.matches(sel)) {
        const hit = outsideComposerSlot(root);
        if (hit && !isHiddenComposerNode(hit)) return hit;
      }
      let first: HTMLElement | null = null;
      for (const el of root.querySelectorAll<HTMLElement>(`:scope ${sel}, ${sel}`)) {
        const hit = outsideComposerSlot(el);
        if (!hit || isHiddenComposerNode(hit)) continue;
        if (hasBox(hit)) return hit;
        first ??= hit;
      }
      if (first) return first;
    } catch {
      /* invalid selector — skip */
    }
  }
  return null;
}

/**
 * Select `range` and tell the editor now. Chrome queues `selectionchange`, and ProseMirror pastes at
 * its own selection until that event arrives, so a paste sent right after moving the caret would
 * land where the student last clicked.
 */
function selectRange(range: Range): void {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

/** Select all of `el`, or put the caret at its start or end. */
function selectContents(el: HTMLElement, caret?: 'start' | 'end'): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  if (caret) range.collapse(caret === 'start');
  selectRange(range);
}

/** True when the editor visibly contains the text we tried to write. */
export function editorReflectsText(el: HTMLElement, expected: string): boolean {
  const got = getEditorTextOf(el);
  if (expected.includes('stemLM instructions')) {
    return got.includes('stemLM instructions') && got.includes('OUTPUT:');
  }
  if (expected.includes('stemLM follow-up context')) {
    return (
      got.includes('stemLM follow-up context') &&
      (got.includes('stemlm-protocol.txt') || got.includes('Follow the attached'))
    );
  }
  if (expected.includes(STUDY_GUIDE_REFERENCE)) {
    return got.includes(STUDY_GUIDE_REFERENCE);
  }
  if (expected.includes('stemlm-protocol.txt') || expected.includes('Follow the attached')) {
    return got.includes('stemlm-protocol.txt') || got.includes('Follow the attached');
  }
  const probe = expected.trim().slice(0, 48);
  return probe.length > 0 && got.includes(probe);
}

function dispatchSyntheticPaste(el: HTMLElement, text: string, mode: 'append' | 'replace'): boolean {
  try {
    const before = getEditorTextOf(el);
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const evt = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    if (el.dispatchEvent(evt)) return true;
    // Rich editors cancel the default paste after inserting clipboard text.
    // Old markers or a partial paste must not count as the requested insertion.
    const expected = mode === 'append' ? `${before}${text}` : text;
    const comparable = (value: string) => normalizeComposerText(value).replace(/\s+/g, ' ');
    return comparable(getEditorTextOf(el)) === comparable(expected);
  } catch {
    return false;
  }
}

function rebuildParagraphs(el: HTMLElement, text: string): void {
  el.textContent = '';
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line.length ? line : '\u00a0';
    el.appendChild(p);
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
}

const FOLLOWUP_QUESTION_MARKER = 'Ask your question here:';

const COMPOSER_ROOT_SELECTOR = [
  'input-area-v2',
  'input-area',
  'rich-textarea',
  '.input-area',
  '[class*="input-area"]',
  'form',
  'fieldset',
  '[data-testid*="composer" i]',
  '[class*="composer"]',
  '[class*="chat-input"]',
].join(', ');

function composerAttachmentRoots(editor: HTMLElement): Set<ParentNode> {
  const roots = new Set<ParentNode>([editor]);
  const closest = editor.closest(COMPOSER_ROOT_SELECTOR);
  if (closest) roots.add(closest);
  let node: HTMLElement | null = editor.parentElement;
  for (let i = 0; i < 8 && node; i++) {
    if (node === document.body || node === document.documentElement) break;
    const tag = node.tagName;
    const testid = (node.getAttribute('data-testid') ?? '').toLowerCase();
    const cls = typeof node.className === 'string' ? node.className : '';
    if (
      tag === 'INPUT-AREA-V2' ||
      tag === 'INPUT-AREA' ||
      tag === 'RICH-TEXTAREA' ||
      tag === 'FORM' ||
      tag === 'FIELDSET' ||
      node.classList.contains('input-area') ||
      /composer|chat-input|input-area|prompt/i.test(cls) ||
      testid.includes('composer') ||
      node.querySelector('images-files-uploader, rich-textarea, input[type="file"]')
    ) {
      roots.add(node);
    }
    node = node.parentElement;
  }
  return roots;
}

/** True when the composer area contains uploads (e.g. a pasted problem photo). */
export function composerHasAttachments(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const roots = composerAttachmentRoots(editor);
  if (editor.querySelector('img, video')) return true;
  for (const root of roots) {
    for (const sel of COMPOSER_ATTACHMENT_SELECTORS) {
      try {
        if (root.querySelector(sel)) return true;
      } catch {
        /* invalid selector */
      }
    }
    const uploader = root.querySelector('images-files-uploader');
    if (uploader && uploader.childElementCount > 1) return true;
  }
  return false;
}

/** Append `text` to the end of the composer without clearing existing content. */
export function appendEditorText(el: HTMLElement, text: string): boolean {
  const tag = el.tagName;
  const prefix = getEditorTextOf(el).trim().length > 0 ? '\n\n' : '\n';
  const chunk = `${prefix}${text}`;

  if (tag === 'TEXTAREA' || tag === 'INPUT') {
    const input = el as HTMLTextAreaElement | HTMLInputElement;
    const next = `${input.value.trimEnd()}${chunk}`;
    const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return editorReflectsText(el, text);
  }

  el.focus();
  selectContents(el, 'end');

  if (dispatchSyntheticPaste(el, chunk, 'append') && editorReflectsText(el, text)) return true;

  try {
    selectContents(el, 'end');
    if (document.execCommand('insertText', false, chunk) && editorReflectsText(el, text)) return true;
  } catch {
    /* fall through */
  }

  // DOM append — preserves images and other non-text nodes in the composer.
  appendDomText(el, text);
  return editorReflectsText(el, text);
}

/** Append plain text as new paragraphs without removing existing editor children. */
function appendDomText(el: HTMLElement, text: string): void {
  if (getEditorTextOf(el).trim().length > 0) {
    const gap = document.createElement('p');
    gap.textContent = '\u00a0';
    el.appendChild(gap);
  }
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line.length ? line : '\u00a0';
    el.appendChild(p);
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
}

/** Replace the content of a composer editor with `text`. Returns success. */
export function setEditorText(el: HTMLElement, text: string): boolean {
  const tag = el.tagName;

  if (tag === 'TEXTAREA' || tag === 'INPUT') {
    const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return editorReflectsText(el, text);
  }

  // contenteditable (ProseMirror / Quill / Lexical) — try several strategies and
  // verify the full protocol landed (Gemini Quill often truncates execCommand).
  el.focus();
  selectContents(el);

  if (dispatchSyntheticPaste(el, text, 'replace') && editorReflectsText(el, text)) return true;

  try {
    selectContents(el);
    if (document.execCommand('insertText', false, text) && editorReflectsText(el, text)) return true;
  } catch {
    /* fall through */
  }

  rebuildParagraphs(el, text);
  return editorReflectsText(el, text);
}

/** Place the caret in the follow-up question slot (after "Ask your question here:"). */
export function focusComposerQuestionSlot(editor: HTMLElement | null): void {
  if (!editor) return;
  editor.focus();

  if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
    const input = editor as HTMLTextAreaElement | HTMLInputElement;
    const value = input.value;
    const idx = value.indexOf(FOLLOWUP_QUESTION_MARKER);
    let pos = idx === -1 ? 0 : idx + FOLLOWUP_QUESTION_MARKER.length;
    while (pos < value.length && (value[pos] === '\n' || value[pos] === '\r')) pos++;
    input.setSelectionRange(pos, pos);
    return;
  }

  // Find the label in the DOM itself: innerText offsets count paragraph breaks that no text node holds.
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? '';
    const idx = text.indexOf(FOLLOWUP_QUESTION_MARKER);
    if (idx === -1) continue;
    const line = node.parentElement?.closest('p, div, li');
    const next = line && line !== editor && editor.contains(line) ? line.nextElementSibling : null;
    const range = document.createRange();
    if (next && !next.textContent?.trim()) {
      // Paragraph editors (ProseMirror, Quill): the question goes on the blank line under the label.
      range.selectNodeContents(next);
      range.collapse(false);
    } else {
      let offset = idx + FOLLOWUP_QUESTION_MARKER.length;
      while (offset < text.length && (text[offset] === '\n' || text[offset] === '\r')) offset++;
      const lineBreak = offset === text.length ? node.nextSibling : null;
      if (lineBreak instanceof HTMLBRElement && (!lineBreak.nextSibling || lineBreak.nextSibling instanceof HTMLBRElement)) {
        // Line-break editors (ChatGPT keeps a paste in one paragraph): the blank line under the label.
        range.setStartAfter(lineBreak);
      } else {
        range.setStart(node, offset);
      }
      range.collapse(true);
    }
    selectRange(range);
    return;
  }
  selectContents(editor, 'start');
}

export function getEditorTextOf(el: HTMLElement | null): string {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    return normalizeComposerText((el as HTMLTextAreaElement | HTMLInputElement).value);
  }
  return normalizeComposerText(readComposerText(el));
}

/** Generic layout-root fallbacks appended to every adapter's own selectors. */
const GENERIC_LAYOUT_ROOTS = ['#__next', '#root', '#app', 'main', '[role="main"]'];

const TRAILING_COMPOSER_LABEL =
  /send|submit|stop|think|voice|microphone|\bmic\b|audio|dictate|speech|search|fast|model|reason|upgrade|dismiss/i;
const LEADING_COMPOSER_LABEL = /add |attach|upload|file|photo|plus|composer-plus|composer menu/i;
const OPEN_LEADING_ROOTS = new Set(['BODY', 'HTML']);

function leadingSearchRoots(shell: HTMLElement | null, editor: HTMLElement | null): ParentNode[] {
  const roots: ParentNode[] = [];
  const seen = new Set<ParentNode>();
  const add = (node: ParentNode | null | undefined) => {
    if (!node || seen.has(node)) return;
    if (node instanceof HTMLElement && OPEN_LEADING_ROOTS.has(node.tagName)) return;
    seen.add(node);
    roots.push(node);
  };
  add(shell);
  add(editor?.parentElement?.parentElement);
  add(editor?.parentElement);
  add(shell?.parentElement);
  return roots;
}

function hopsUntilContains(from: HTMLElement, target: HTMLElement): number {
  let hops = 0;
  let node: HTMLElement | null = from;
  while (node && hops < 24) {
    if (node.contains(target)) return hops;
    node = node.parentElement;
    hops++;
  }
  return 99;
}

function leadingTieBreak(el: HTMLElement): number {
  const testid = (el.getAttribute('data-testid') ?? '').toLowerCase();
  if (testid.includes('composer-plus')) return -0.25;
  if (el.getAttribute('aria-haspopup')) return -0.1;
  return 0;
}

function pickClosestToEditor(hits: HTMLElement[], editor: HTMLElement | null): HTMLElement | null {
  if (!hits.length) return null;
  if (!editor || hits.length === 1) return hits[0] ?? null;
  let best = hits[0]!;
  let bestScore = hopsUntilContains(editor, best) + leadingTieBreak(best);
  for (const hit of hits.slice(1)) {
    const score = hopsUntilContains(editor, hit) + leadingTieBreak(hit);
    if (score < bestScore) {
      best = hit;
      bestScore = score;
    }
  }
  return best;
}

function collectLeadingHits(
  selectors: string[],
  roots: ParentNode[],
  editor: HTMLElement | null,
  shell: HTMLElement | null,
): HTMLElement[] {
  const hits: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  for (const root of roots) {
    for (const sel of selectors) {
      try {
        const list: HTMLElement[] = [];
        if (root instanceof HTMLElement && root.matches(sel)) list.push(root);
        root.querySelectorAll<HTMLElement>(`:scope ${sel}, ${sel}`).forEach((el) => list.push(el));
        for (const el of list) {
          const hit = outsideComposerSlot(el);
          if (!hit || isHiddenComposerNode(hit)) continue;
          const control = climbToHostControl(hit);
          if (seen.has(control) || isHiddenComposerNode(control)) continue;
          if (!sharesComposer(control, editor, shell)) continue;
          seen.add(control);
          hits.push(control);
        }
      } catch {
        /* invalid selector */
      }
    }
  }
  return hits;
}

/** Last-resort: first non-trailing button in the composer (usually the host +). */
function guessLeadingComposerButton(root: HTMLElement): HTMLElement | null {
  const buttons = root.querySelectorAll<HTMLElement>('button, [role="button"]');
  let fallback: HTMLElement | null = null;
  for (const raw of buttons) {
    const hit = outsideComposerSlot(raw);
    if (!hit || isHiddenComposerNode(hit)) continue;
    const control = climbToHostControl(hit);
    const label = `${control.getAttribute('aria-label') ?? ''} ${control.getAttribute('title') ?? ''} ${control.getAttribute('data-testid') ?? ''}`;
    if (LEADING_COMPOSER_LABEL.test(label)) return control;
    if (TRAILING_COMPOSER_LABEL.test(label)) continue;
    if (!fallback) fallback = control;
  }
  return fallback;
}

export function createAdapter(config: AdapterConfig): PlatformAdapter {
  const withoutCitations = (text: string) =>
    (config.citationMarkers ?? []).reduce((out, marker) => out.replace(marker, ''), text);

  return {
    id: config.id,
    label: config.label,
    brand: config.brand,
    composerDock: config.composerDock ?? 'before-plus',
    insideDock: config.insideDock ?? 'insert',
    fileInput: config.fileInput,
    additiveFileInput: config.additiveFileInput ?? false,
    layoutRoots: [...(config.layoutRoots ?? []), ...GENERIC_LAYOUT_ROOTS],

    matches(host = location.hostname) {
      return config.hosts.test(host);
    },

    findEditor() {
      return firstMatchOutsideSlot(config.editor);
    },

    getEditorText() {
      return getEditorTextOf(this.findEditor());
    },

    insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
      const editor = this.findEditor();
      if (!editor) return false;
      return mode === 'append' ? appendEditorText(editor, text) : setEditorText(editor, text);
    },

    composerHasAttachments() {
      return composerHasAttachments(this.findEditor());
    },

    focusComposerQuestionSlot() {
      focusComposerQuestionSlot(this.findEditor());
    },

    getComposerBox() {
      const shell = this.getComposerShell();
      const root = shell ?? document;
      const box = firstMatch(config.composerBox, root);
      if (box) return box;

      const editor = firstMatch(config.editor, root);
      const row =
        firstMatch(config.composerActionRow, root) ?? firstMatch(config.composerAnchor, root);

      if (editor && row) {
        let node: HTMLElement | null = editor.parentElement;
        while (node && node !== document.body) {
          if (node.contains(row)) return node;
          node = node.parentElement;
        }
      }

      return (
        editor?.closest('form, fieldset, [role="form"], rich-textarea') ??
        row?.closest('form, fieldset, [role="form"]') ??
        null
      );
    },

    getComposerActionRow() {
      const root = this.getComposerShell() ?? document;
      const row = firstMatch(config.composerActionRow, root);
      if (row) return row;
      const anchor = firstMatch(config.composerAnchor, root);
      return anchor?.parentElement ?? null;
    },

    getComposerLayout() {
      const box = this.getComposerBox();
      const actionRow = this.getComposerActionRow();
      if (!box || !actionRow) return null;
      if (!box.contains(actionRow) && actionRow !== box) {
        // Action row may be a sibling inside a shared parent — still usable.
        const shared = box.contains(actionRow) ? box : actionRow.closest('form, fieldset');
        if (!shared) return null;
      }
      return { box, actionRow };
    },

    getComposerAnchor() {
      const root = this.getComposerShell() ?? document;
      return firstMatch(config.composerAnchor, root) ?? firstMatch(config.editor, root)?.parentElement ?? null;
    },

    getComposerLeadingAnchor() {
      const shell = this.getComposerShell();
      const editor = this.findEditor();
      if (config.composerLeading) {
        const local = collectLeadingHits(
          config.composerLeading,
          leadingSearchRoots(shell, editor),
          editor,
          shell,
        );
        const localBest = pickClosestToEditor(local, editor);
        if (localBest) return localBest;
        const global = collectLeadingHits(config.composerLeading, [document], editor, shell);
        const globalBest = pickClosestToEditor(global, editor);
        if (globalBest) return globalBest;
      }
      const guessRoot =
        shell ??
        (editor?.closest('form, fieldset, [role="form"]') as HTMLElement | null) ??
        editor?.parentElement ??
        null;
      if (guessRoot) {
        const guess = guessLeadingComposerButton(guessRoot);
        if (guess && sharesComposer(guess, editor, shell)) return guess;
      }
      return null;
    },

    getComposerShell() {
      const shell = config.composerShell ? firstMatchOutsideSlot(config.composerShell) : null;
      if (shell && !isHiddenComposerNode(shell)) return shell;
      const editor = this.findEditor();
      if (!editor) return null;
      // Walk up to find a reasonable composer container (form, fieldset, or positioned wrapper).
      let el: HTMLElement | null = editor;
      for (let i = 0; i < 5 && el; i++) {
        const tag = el.tagName;
        if (tag === 'FORM' || tag === 'FIELDSET' || el.getAttribute('role') === 'textbox') {
          return isHiddenComposerNode(el) ? null : el;
        }
        el = el.parentElement;
      }
      const fallback = editor.parentElement ?? editor;
      return isHiddenComposerNode(fallback) ? null : fallback;
    },

    getAssistantBlocks() {
      return assistantBlocks(config.assistant);
    },

    getLatestAssistantText() {
      const blocks = assistantBlocks(config.assistant);
      const last = blocks[blocks.length - 1];
      return last ? withoutCitations(last.innerText ?? last.textContent ?? '') : '';
    },

    extractCapsules() {
      const capsules: string[] = [];
      for (const block of assistantBlocks(config.assistant)) {
        // Within a message keep only the innermost code elements so a <pre>
        // wrapping a <code> is not counted twice; dedupe identical text.
        const codes = innermost(allMatches([...STEMLM_CODE_SELECTORS, ...config.codeBlock], block));
        const seenText = new Set<string>();
        const blockCapsules: string[] = [];
        for (const code of codes) {
          const text = withoutCitations(code.textContent ?? '');
          if (text.includes('@meta') && !seenText.has(text)) {
            seenText.add(text);
            blockCapsules.push(text);
          }
        }
        const complete = blockCapsules.filter(hasEndToken);
        capsules.push(...(complete.length ? complete : blockCapsules));
      }
      // If the model dropped the fence, fall back to scanning message text.
      if (capsules.length === 0) {
        for (const block of assistantBlocks(config.assistant)) {
          const text = withoutCitations(block.innerText ?? block.textContent ?? '');
          if (text.includes('@meta')) capsules.push(text);
        }
      }

      // Last resort: scan the conversation container for any stemLM code blocks.
      if (capsules.length === 0) {
        const roots = allMatches([...(config.layoutRoots ?? []), ...GENERIC_LAYOUT_ROOTS]);
        const seen = new Set(capsules);
        for (const root of roots.length ? roots : [document.body]) {
          const codes = innermost(allMatches([...STEMLM_CODE_SELECTORS, ...config.codeBlock], root));
          for (const code of codes) {
            const text = withoutCitations(code.textContent ?? '');
            if (text.includes('@meta') && !seen.has(text)) {
              seen.add(text);
              capsules.push(text);
            }
          }
        }
      }

      return capsules;
    },

    isStreaming() {
      return config.streaming.length > 0 && firstMatch(config.streaming) !== null;
    },

    getUserQuestionBefore(block: Element) {
      return userQuestionBefore(block, [...(config.userMessage ?? []), ...USER_TURN_FALLBACKS], config.userMessageText ?? []);
    },
  };
}
