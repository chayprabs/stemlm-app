/**
 * Adapter factory + shared DOM helpers.
 *
 * Gemini differs only in selectors and a couple of behaviours, so
 * we build each adapter from a declarative AdapterConfig. The fragile,
 * frequently-changing bits (selectors) live in the Gemini config file
 * for easy maintenance.
 */
import type { AdapterConfig, PlatformAdapter } from './types';

const STEMLM_CODE_SELECTORS = [
  'pre code.language-stemlm',
  'pre code[class*="language-stemlm"]',
  'pre code',
  'pre',
];

function hasEndToken(text: string): boolean {
  return text.split('\n').some((line) => line.trim() === '@end');
}

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

function selectAllContents(el: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** True when the editor visibly contains the text we tried to write. */
export function editorReflectsText(el: HTMLElement, expected: string): boolean {
  const got = getEditorTextOf(el);
  if (expected.includes('stemLM instructions')) {
    return got.includes('stemLM instructions') && got.includes('OUTPUT:');
  }
  const probe = expected.trim().slice(0, 48);
  return probe.length > 0 && got.includes(probe);
}

function dispatchSyntheticPaste(el: HTMLElement, text: string): boolean {
  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const evt = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    return el.dispatchEvent(evt);
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
  selectAllContents(el);

  if (dispatchSyntheticPaste(el, text) && editorReflectsText(el, text)) return true;

  try {
    selectAllContents(el);
    if (document.execCommand('insertText', false, text) && editorReflectsText(el, text)) return true;
  } catch {
    /* fall through */
  }

  rebuildParagraphs(el, text);
  return editorReflectsText(el, text);
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

    getComposerBox() {
      const box = firstMatch(config.composerBox);
      if (box) return box;

      const editor = firstMatch(config.editor);
      const row =
        firstMatch(config.composerActionRow) ?? firstMatch(config.composerAnchor);

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
      const row = firstMatch(config.composerActionRow);
      if (row) return row;
      const anchor = firstMatch(config.composerAnchor);
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
      return firstMatch(config.composerAnchor) ?? firstMatch(config.editor)?.parentElement ?? null;
    },

    getComposerLeadingAnchor() {
      return config.composerLeading ? firstMatch(config.composerLeading) : null;
    },

    getComposerShell() {
      const shell = config.composerShell ? firstMatch(config.composerShell) : null;
      if (shell) return shell;
      const editor = firstMatch(config.editor);
      if (!editor) return null;
      // Walk up to find a reasonable composer container (form, fieldset, or positioned wrapper).
      let el: HTMLElement | null = editor;
      for (let i = 0; i < 5 && el; i++) {
        const tag = el.tagName;
        if (tag === 'FORM' || tag === 'FIELDSET' || el.getAttribute('role') === 'textbox') return el;
        el = el.parentElement;
      }
      return editor.parentElement ?? editor;
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
        const codes = innermost(allMatches([...STEMLM_CODE_SELECTORS, ...config.codeBlock], block));
        const seenText = new Set<string>();
        const blockCapsules: string[] = [];
        for (const code of codes) {
          const text = code.textContent ?? '';
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
