/**
 * The chat column, tidied.
 *
 * A stemLM answer reaches the chat as one raw `@meta … @end` code block, and the student's own
 * message carries stemLM's instructions under the question. Both stay in the page exactly as the
 * chat wrote them. This module only marks them, with one attribute each, and one stylesheet in
 * <head> folds what is marked to a single line with a way to show the text again. No node is
 * added to or removed from the chat's own tree, so a chat that re-renders its messages meets
 * nothing it did not write.
 *
 * A code block is folded only when the controller has read it: an answer it could not parse, or
 * one the chat stopped writing, is the student's only copy and stays as it is. The wrapper to
 * fold is found from the code element itself, never from a selector of the chat's markup.
 */
import { THREAD_PROTOCOL_SELECTORS } from '@/src/protocol/builder';
import type { CapsuleSource } from '@/src/platforms/types';

export const CAPSULE_ATTR = 'data-stemlm-capsule';
export const NOTE_ATTR = 'data-stemlm-note';
export const OPEN_ATTR = 'data-stemlm-open';
const STYLE_ID = 'stemlm-chat-tidy';

/** Height of the folded row, and of the strip that holds "Hide text" above a shown block. */
const ROW_PX = 44;
const STRIP_PX = 32;
/** The right end of the row is the "Show text" / "Hide text" control. */
const TOGGLE_PX = 120;
/** Answers remembered as read; the oldest are forgotten first. */
const READ_MAX = 100;
/** The first characters of both lines stemLM writes above its own text in a message. */
const NOTE_MARK = '--- stemLM';

const ROW_LABEL = 'stemLM answer, shown in the panel';
const ROW_LABEL_WRITING = 'stemLM answer, still being written';

/**
 * The folded row takes its type and ink from the reply around it (`inherit`), and its surface is a
 * wash of that ink, so it sits in any chat's light or dark theme without knowing its colours.
 * Over a block that is shown again the chat's own colours are back, which this sheet cannot know:
 * "Hide text" is set in difference, which reads on a light and on a dark surface alike.
 */
const BASE_CSS = `
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}]) {
  display: block !important;
  box-sizing: border-box !important;
  position: relative !important;
  height: ${ROW_PX}px !important;
  min-height: 0 !important;
  max-height: ${ROW_PX}px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: color-mix(in srgb, currentColor 7%, transparent) !important;
  box-shadow: none !important;
  color: inherit !important;
  font: inherit !important;
  cursor: pointer !important;
  user-select: none !important;
}
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}]) > * { visibility: hidden !important; }
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}])::before,
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}])::after {
  position: absolute;
  top: 0;
  height: ${ROW_PX}px;
  line-height: ${ROW_PX}px;
  white-space: nowrap;
  font-style: normal;
  letter-spacing: normal;
  text-transform: none;
}
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}])::before {
  content: '${ROW_LABEL}';
  left: 16px;
  max-width: calc(100% - ${TOGGLE_PX + 16}px);
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.875em;
  font-weight: 500;
}
[${CAPSULE_ATTR}="streaming"]:not([${OPEN_ATTR}])::before { content: '${ROW_LABEL_WRITING}'; }
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}])::after {
  content: 'Show text';
  right: 16px;
  font-size: 0.8125em;
  font-weight: 400;
  opacity: 0.7;
}
[${CAPSULE_ATTR}]:not([${OPEN_ATTR}]):hover::after {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}
[${CAPSULE_ATTR}]:focus-visible {
  outline: 2px solid currentColor !important;
  outline-offset: 2px !important;
}
[${CAPSULE_ATTR}][${OPEN_ATTR}] {
  position: relative !important;
  padding-top: ${STRIP_PX}px !important;
}
[${CAPSULE_ATTR}][${OPEN_ATTR}]::after {
  content: 'Hide text';
  position: absolute;
  top: 0;
  right: 16px;
  height: ${STRIP_PX}px;
  line-height: ${STRIP_PX}px;
  font: 400 13px/${STRIP_PX}px system-ui, -apple-system, "Segoe UI", sans-serif;
  white-space: nowrap;
  color: #fff;
  mix-blend-mode: difference;
  opacity: 0.75;
  cursor: pointer;
}
[${CAPSULE_ATTR}][${OPEN_ATTR}]:hover::after {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}
[${NOTE_ATTR}] { position: relative !important; }
[${NOTE_ATTR}]::after {
  content: 'Show the stemLM guide';
  position: absolute;
  white-space: nowrap;
  font-size: 0.8125em;
  font-style: normal;
  font-weight: 400;
  opacity: 0.7;
  cursor: pointer;
}
[${NOTE_ATTR}][${OPEN_ATTR}]::after { content: 'Hide the stemLM guide'; }
[${NOTE_ATTR}]:hover::after {
  opacity: 1;
  text-decoration: underline;
  text-underline-offset: 3px;
}
`;

/** Elements that are part of a reply's prose, never of a code block's own header or toolbar. */
const PROSE_TAGS = new Set(['P', 'UL', 'OL', 'LI', 'PRE', 'TABLE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/** A code block's own header or toolbar: short, and holding nothing of the reply's text. */
function isBlockChrome(node: Node): boolean {
  const text = (node.textContent ?? '').trim();
  if (!(node instanceof Element)) return text === '';
  return !PROSE_TAGS.has(node.tagName) && text.length <= 40 && node.querySelector('p, li, pre, table') === null;
}

/**
 * The element to fold for a capsule read from `code` inside the reply `message`: its `pre`, then
 * outwards for as long as the only other things in the wrapper are the block's own header and
 * buttons. Null when the block is not inside the reply, or is the reply: nothing is folded then.
 */
export function foldableWrapper(code: HTMLElement | null, message: HTMLElement | null): HTMLElement | null {
  if (!code || !message) return null;
  let node = code.closest<HTMLElement>('pre') ?? code.parentElement;
  if (!node || node === message || !message.contains(node)) return null;
  for (let hops = 0; hops < 4; hops++) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent || parent === message || !message.contains(parent)) break;
    if ([...parent.childNodes].some((sibling) => sibling !== node && !isBlockChrome(sibling))) break;
    node = parent;
  }
  return node;
}

interface Fold {
  state: 'streaming' | 'done';
  sessionId: string;
}

/** Where the instructions in one of the student's messages are cut, in px of that element. */
interface NoteCut {
  /** `max-height` that ends the box at the top of stemLM's first line. */
  maxHeight: number;
  /** Top of the blank line above it, from the padding edge: where the expander is written. */
  top: number;
  lineHeight: number;
  left: number;
  /** Bottom padding, redrawn as a transparent border so the cut text cannot show in it. */
  padBottom: number;
}

const px = (value: string): number => Number.parseFloat(value) || 0;

/** Not the student's text: controls, icons, hidden labels, and the file chips a sent message shows. */
const NOT_TYPED = 'button, [role="button"], svg, style, script, [aria-hidden="true"], .sr-only, ' +
  'user-query-file-preview, [data-testid*="file" i], [class*="attachment" i], [class*="file-preview" i]';

/** The text nodes of `root` a student would read. */
function readableTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest(NOT_TYPED)) nodes.push(node as Text);
  }
  return nodes;
}

/**
 * The element of the student's message `turn` that holds its text, and where to cut it so that
 * only the question shows. Null when the message has none of stemLM's lines, when no blank line
 * separates them from the question (there is then nowhere to write the expander), or when the
 * page gives no measurements.
 */
function measureNote(turn: HTMLElement): { el: HTMLElement; cut: NoteCut } | null {
  const nodes = readableTextNodes(turn);
  const at = nodes.findIndex((node) => node.data.includes(NOTE_MARK));
  const markNode = nodes[at];
  if (!markNode) return null;
  const offset = markNode.data.indexOf(NOTE_MARK);
  const range = document.createRange();
  range.setStart(markNode, offset);
  range.setEnd(markNode, offset + 3);
  const mark = range.getBoundingClientRect();
  if (!mark.height) return null;

  // Where the question ends: the last thing written above stemLM's first line.
  let above: DOMRect | null = null;
  for (let i = at; i >= 0 && !above; i--) {
    const node = nodes[i]!;
    const text = i === at ? node.data.slice(0, offset) : node.data;
    const end = text.trimEnd().length;
    if (!end) continue;
    range.setStart(node, end - 1);
    range.setEnd(node, end);
    above = range.getBoundingClientRect();
  }

  // The element holding the question, stemLM's first line and the line after it.
  const after = nodes[at + 1] ?? markNode;
  range.setStart(nodes[0]!, 0);
  range.setEnd(after, after.data.length);
  const common = range.commonAncestorContainer;
  const el = common instanceof HTMLElement ? common : common.parentElement;
  if (!el || !turn.contains(el)) return null;

  const box = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const borderTop = px(style.borderTopWidth);
  const padTop = px(style.paddingTop);
  // Measured again once clipped (the column narrowed): the bottom padding is then drawn as our border.
  const clipped = el.hasAttribute(NOTE_ATTR) && !el.hasAttribute(OPEN_ATTR);
  const padBottom = px(clipped ? style.borderBottomWidth : style.paddingBottom);
  if (style.position !== 'static' && style.position !== 'relative') return null;
  // A flex or grid box given a max-height moves its content (one that packs it at its end shows the
  // instructions' last lines): only a box of text is cut.
  if (/flex|grid/.test(style.display)) return null;
  if (!clipped && padBottom > 0 && px(style.borderBottomWidth) > 0) return null;
  const contentTop = box.top + borderTop + padTop;
  const questionBottom = above ? above.bottom : contentTop;
  // The expander is written on the blank line between the question and stemLM's lines.
  if (mark.top - questionBottom < mark.height * 0.6) return null;
  const cutAt = mark.top - contentTop;
  if (cutAt <= 0) return null;
  const inner = style.boxSizing === 'border-box' ? cutAt + padTop + borderTop + padBottom : cutAt;
  return {
    el,
    cut: {
      maxHeight: Math.round(inner),
      top: Math.max(0, Math.round(mark.top - mark.height - (box.top + borderTop))),
      lineHeight: Math.round(mark.height),
      left: Math.round(px(style.paddingLeft)),
      padBottom: Math.round(padBottom),
    },
  };
}

const noteKey = (cut: NoteCut): string => `${cut.maxHeight}-${cut.top}-${cut.lineHeight}-${cut.left}-${cut.padBottom}`;

function noteRule(key: string, cut: NoteCut): string {
  const at = `[${NOTE_ATTR}="${key}"]`;
  return `${at}:not([${OPEN_ATTR}]) { max-height: ${cut.maxHeight}px !important; overflow: hidden !important; ` +
    `padding-bottom: 0 !important; border-bottom: ${cut.padBottom}px solid transparent !important; }\n` +
    `${at}::after { top: ${cut.top}px; left: ${cut.left}px; line-height: ${cut.lineHeight}px; }\n`;
}

export class ChatTidy {
  /** Capsule text as it is on the page (trimmed) to the question it is shown under in the panel. */
  private read = new Map<string, string>();
  /** Answers and messages whose text the student asked to see: kept through the chat's re-renders. */
  private shown = new Set<string>();
  private owner = new WeakMap<Element, string>();
  /** Folded blocks given a button's role and tab stop here, so only those are taken back. */
  private dressed = new WeakSet<Element>();
  /** The block being written now, and its reply: what the chat re-renders between two looks. */
  private writing: { wrapper: HTMLElement; message: HTMLElement; fold: Fold } | null = null;
  /** Each of the student's messages looked at, with the element marked in it, if any. */
  private notes = new WeakMap<Element, HTMLElement | null>();
  private noteRules = new Map<string, string>();
  private resize: ResizeObserver | null = null;
  private style: HTMLStyleElement | null = null;
  private listening = false;

  /** `openAnswer`: the student pressed a folded row, to read that answer in the panel. */
  constructor(private readonly openAnswer: (sessionId: string) => void) {}

  /** The controller read this capsule (trimmed, as on the page) and shows it under `sessionId`. */
  markRead(text: string, sessionId: string): void {
    if (this.read.size >= READ_MAX) this.read.delete(this.read.keys().next().value!);
    this.read.set(text, sessionId);
  }

  /**
   * Mark what may be folded now, and unmark what no longer may. `sources`: the capsules on the
   * page. `writingId`: the answer the newest of them is still being written into, if any.
   * `inPanel`: whether a question is still in the panel (a removed one unfolds its text).
   */
  sync(sources: readonly CapsuleSource[], writingId: string | undefined, inPanel: (sessionId: string) => boolean): void {
    this.listen();
    const wanted = new Map<HTMLElement, Fold>();
    this.writing = null;
    sources.forEach((source, i) => {
      const readAs = this.read.get(source.text.trim());
      const fold: Fold | null = readAs && inPanel(readAs)
        ? { state: 'done', sessionId: readAs }
        : writingId && i === sources.length - 1 ? { state: 'streaming', sessionId: writingId } : null;
      const wrapper = fold && foldableWrapper(source.code, source.message);
      if (!fold || !wrapper) return;
      wanted.set(wrapper, fold);
      if (fold.state === 'streaming' && source.message) this.writing = { wrapper, message: source.message, fold };
    });
    for (const el of document.querySelectorAll<HTMLElement>(`[${CAPSULE_ATTR}]`)) {
      if (!wanted.has(el)) this.unmark(el);
    }
    for (const [el, fold] of wanted) this.mark(el, fold);
    this.syncNotes();
  }

  /**
   * In the capture observer's own callback, so before the page is painted: a chat rebuilds the
   * block it is writing many times a second, and the new node has no mark. Costs one query on the
   * newest reply, and only when its block was replaced.
   */
  retag(): void {
    const writing = this.writing;
    if (!writing || (writing.wrapper.isConnected && writing.wrapper.hasAttribute(CAPSULE_ATTR))) return;
    if (!writing.message.isConnected) return;
    const blocks = [...writing.message.querySelectorAll<HTMLElement>('pre, code')].filter((el) => (el.textContent ?? '').includes('@meta'));
    const code = blocks.find((el) => !blocks.some((other) => other !== el && el.contains(other)));
    const wrapper = foldableWrapper(code ?? null, writing.message);
    if (!wrapper) return;
    writing.wrapper = wrapper;
    this.mark(wrapper, writing.fold);
  }

  /** Take every mark and the stylesheet back out of the page. */
  clear(): void {
    for (const el of document.querySelectorAll<HTMLElement>(`[${CAPSULE_ATTR}]`)) this.unmark(el);
    for (const el of document.querySelectorAll<HTMLElement>(`[${NOTE_ATTR}]`)) {
      el.removeAttribute(NOTE_ATTR);
      el.removeAttribute(OPEN_ATTR);
    }
    this.notes = new WeakMap();
    this.resize?.disconnect();
    this.resize = null;
    this.writing = null;
    this.style?.remove();
    this.style = null;
    if (this.listening) {
      document.removeEventListener('click', this.onClick, true);
      document.removeEventListener('keydown', this.onKeyDown, true);
      this.listening = false;
    }
  }

  private listen(): void {
    if (!this.style?.isConnected) {
      this.style ??= Object.assign(document.createElement('style'), { id: STYLE_ID });
      this.writeStyle();
      (document.head ?? document.documentElement).append(this.style);
    }
    if (this.listening) return;
    this.listening = true;
    // Capture phase: the press is handled before the chat's own handlers see it.
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
  }

  private writeStyle(): void {
    if (this.style) this.style.textContent = BASE_CSS + [...this.noteRules.values()].join('');
  }

  private mark(el: HTMLElement, fold: Fold): void {
    this.owner.set(el, fold.sessionId);
    // Written only when it differs: the chat's own observers are not woken for nothing.
    if (el.getAttribute(CAPSULE_ATTR) !== fold.state) el.setAttribute(CAPSULE_ATTR, fold.state);
    this.dress(el, this.shown.has(fold.sessionId));
  }

  /** Shown or folded, and the keyboard's way to the folded row: a button that shows the text. */
  private dress(el: HTMLElement, open: boolean): void {
    if (el.hasAttribute(OPEN_ATTR) !== open) el.toggleAttribute(OPEN_ATTR, open);
    if (!open && !this.dressed.has(el) && !el.hasAttribute('role') && !el.hasAttribute('tabindex')) {
      this.dressed.add(el);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${el.getAttribute(CAPSULE_ATTR) === 'streaming' ? ROW_LABEL_WRITING : ROW_LABEL}. Show its text`);
    } else if (open) {
      this.undress(el);
    }
  }

  private undress(el: HTMLElement): void {
    if (!this.dressed.delete(el)) return;
    for (const name of ['role', 'tabindex', 'aria-label']) el.removeAttribute(name);
  }

  private unmark(el: HTMLElement): void {
    el.removeAttribute(CAPSULE_ATTR);
    el.removeAttribute(OPEN_ATTR);
    this.undress(el);
  }

  private setShown(el: HTMLElement, id: string, open: boolean): void {
    if (open) this.shown.add(id);
    else this.shown.delete(id);
    if (el.hasAttribute(NOTE_ATTR)) el.toggleAttribute(OPEN_ATTR, open);
    else this.dress(el, open);
  }

  /** Clip stemLM's instructions in each of the student's sent messages that has not been looked at. */
  private syncNotes(): void {
    let turns: HTMLElement[];
    try {
      turns = [...document.querySelectorAll<HTMLElement>(THREAD_PROTOCOL_SELECTORS.join(','))];
    } catch {
      return;
    }
    for (const turn of turns) {
      if (turns.some((other) => other !== turn && other.contains(turn))) continue;
      const known = this.notes.get(turn);
      if (known === null || (known?.isConnected && known.hasAttribute(NOTE_ATTR))) continue;
      this.clipNote(turn);
    }
  }

  private clipNote(turn: HTMLElement): void {
    if (!(turn.textContent ?? '').includes(NOTE_MARK)) {
      this.notes.set(turn, null);
      return;
    }
    const found = measureNote(turn);
    // Not measurable yet (not laid out) or not clippable: looked at again on the next pass.
    if (!found) return;
    this.applyCut(found.el, found.cut);
    this.notes.set(turn, found.el);
    if (typeof ResizeObserver === 'undefined') return;
    // The column narrows when the panel opens: the question wraps and the cut moves.
    this.resize ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const again = el.isConnected && el.hasAttribute(NOTE_ATTR) ? measureNote(el) : null;
        if (again?.el === el) this.applyCut(el, again.cut);
      }
    });
    this.resize.observe(found.el);
  }

  private applyCut(el: HTMLElement, cut: NoteCut): void {
    const key = noteKey(cut);
    if (!this.noteRules.has(key)) {
      this.noteRules.set(key, noteRule(key, cut));
      this.writeStyle();
    }
    if (el.getAttribute(NOTE_ATTR) !== key) el.setAttribute(NOTE_ATTR, key);
  }

  private onClick = (event: MouseEvent): void => {
    const el = event.target instanceof Element ? event.target.closest<HTMLElement>(`[${CAPSULE_ATTR}], [${NOTE_ATTR}]`) : null;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const open = el.hasAttribute(OPEN_ATTR);
    const note = el.getAttribute(NOTE_ATTR);
    if (note !== null) {
      // The expander's line; the rest of the message is the student's text, to select and copy.
      const [, top = 0, lineHeight = 0] = note.split('-').map(Number);
      const y = event.clientY - box.top - px(getComputedStyle(el).borderTopWidth);
      if (y < top || y > top + lineHeight) return;
      event.preventDefault();
      event.stopPropagation();
      this.setShown(el, note, !open);
      return;
    }
    const id = this.owner.get(el);
    if (!id || event.clientY - box.top > (open ? STRIP_PX : ROW_PX)) return;
    const onToggle = box.right - event.clientX <= TOGGLE_PX;
    // Over a block that is shown, only "Hide text" is stemLM's; the rest is the chat's.
    if (open && !onToggle) return;
    event.preventDefault();
    event.stopPropagation();
    if (onToggle) this.setShown(el, id, !open);
    else this.openAnswer(id);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const el = event.target;
    if (!(el instanceof HTMLElement) || !this.dressed.has(el) || (event.key !== 'Enter' && event.key !== ' ')) return;
    const id = this.owner.get(el);
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    this.setShown(el, id, true);
  };
}
