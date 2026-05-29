/**
 * Adapter factory + shared DOM helpers.
 *
 * The three platforms differ only in selectors and a couple of behaviours, so
 * we build each adapter from a declarative AdapterConfig. The fragile,
 * frequently-changing bits (selectors) live in the per-platform config files
 * for easy maintenance.
 */
import type { AdapterConfig, PlatformAdapter } from './types';

function firstMatch(selectors: string[], root: ParentNode = document): HTMLElement | null {
  for (const sel of selectors) {
    try {
      const el = root.querySelector<HTMLElement>(sel);
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

/** Replace the content of a composer editor with `text`. Returns success. */
export function setEditorText(el: HTMLElement, text: string): boolean {
  const tag = el.tagName;

  if (tag === 'TEXTAREA' || tag === 'INPUT') {
    const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // contenteditable (ProseMirror / Quill / Lexical)
  el.focus();
  try {
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // execCommand is deprecated but remains the most reliable way to drive
    // framework-backed contenteditable editors (React/ProseMirror listen for
    // beforeinput/input which execCommand fires natively).
    const ok = document.execCommand('insertText', false, text);
    if (ok && el.innerText.trim().length > 0) return true;
  } catch {
    /* fall through to manual fallback */
  }

  // Fallback: rebuild paragraphs manually and fire an input event.
  el.textContent = '';
  const lines = text.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line.length ? line : '\u00a0';
    el.appendChild(p);
  }
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
  return true;
}

export function getEditorTextOf(el: HTMLElement | null): string {
  if (!el) return '';
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    return (el as HTMLTextAreaElement | HTMLInputElement).value;
  }
  return el.innerText ?? el.textContent ?? '';
}

/** Generic layout-root fallbacks appended to every adapter's own selectors. */
const GENERIC_LAYOUT_ROOTS = ['#__next', '#root', '#app', 'main', '[role="main"]'];

export function createAdapter(config: AdapterConfig): PlatformAdapter {
  return {
    id: config.id,
    label: config.label,
    brand: config.brand,
    layoutRoots: [...(config.layoutRoots ?? []), ...GENERIC_LAYOUT_ROOTS],

    matches(host = location.hostname) {
      return config.hosts.test(host);
    },

    findEditor() {
      return firstMatch(config.editor);
    },

    getEditorText() {
      return getEditorTextOf(firstMatch(config.editor));
    },

    insertPrompt(text: string) {
      const editor = firstMatch(config.editor);
      if (!editor) return false;
      return setEditorText(editor, text);
    },

    getComposerAnchor() {
      return firstMatch(config.composerAnchor) ?? firstMatch(config.editor)?.parentElement ?? null;
    },

    getAssistantBlocks() {
      return innermost(allMatches(config.assistant));
    },

    getLatestAssistantText() {
      const blocks = innermost(allMatches(config.assistant));
      const last = blocks[blocks.length - 1];
      return last ? (last.innerText ?? last.textContent ?? '') : '';
    },

    extractCapsules() {
      const capsules: string[] = [];
      for (const block of innermost(allMatches(config.assistant))) {
        // Within a message keep only the innermost code elements so a <pre>
        // wrapping a <code> is not counted twice; dedupe identical text.
        const codes = innermost(allMatches(config.codeBlock, block));
        const seenText = new Set<string>();
        for (const code of codes) {
          const text = code.textContent ?? '';
          if (text.includes('@meta') && !seenText.has(text)) {
            seenText.add(text);
            capsules.push(text);
          }
        }
      }
      // If the model dropped the fence, fall back to scanning message text.
      if (capsules.length === 0) {
        for (const block of innermost(allMatches(config.assistant))) {
          const text = block.innerText ?? block.textContent ?? '';
          if (text.includes('@meta')) capsules.push(text);
        }
      }
      return capsules;
    },

    isStreaming() {
      return config.streaming.length > 0 && firstMatch(config.streaming) !== null;
    },
  };
}

export const _internal = { firstMatch, allMatches, innermost };
