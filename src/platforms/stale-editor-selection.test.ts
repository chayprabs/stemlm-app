import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeAdapter } from './claude';

/**
 * ProseMirror-style editors paste at their OWN selection, which they sync from the DOM only when
 * `selectionchange` arrives. Chrome queues that event (happy-dom fires it synchronously inside
 * addRange), so the harness below defers the native event the way Chrome does.
 */
function selectionOffsets(root: HTMLElement): [number, number] | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const current = sel.getRangeAt(0);
  if (!root.contains(current.startContainer) || !root.contains(current.endContainer)) return null;
  const offset = (node: Node, at: number) => {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, at);
    return range.toString().length;
  };
  return [offset(current.startContainer, current.startOffset), offset(current.endContainer, current.endOffset)];
}

describe('rich editor whose selection lags the DOM caret', () => {
  const draft = 'Find its acceleration, then plot its velocity.';
  const pointer = '--- stemLM ---\nFollow the attached stemLM study guide.';
  let editor: HTMLElement;
  let editorSelection: [number, number];
  let execCommand: ReturnType<typeof vi.fn>;
  let priorExecCommand: PropertyDescriptor | undefined;
  const restore: Array<() => void> = [];

  beforeEach(() => {
    document.body.innerHTML = `<fieldset><div class="ProseMirror" contenteditable="true"><p>${draft}</p></div><button aria-label="Send Message">Send</button></fieldset>`;
    editor = document.querySelector<HTMLElement>('.ProseMirror')!;
    const paragraph = editor.querySelector('p')!;

    // Chrome delivers selectionchange as a queued task, never inside addRange/removeAllRanges.
    const proto = Object.getPrototypeOf(window.getSelection()!);
    let native = false;
    for (const name of ['addRange', 'removeAllRanges'] as const) {
      const real = proto[name];
      proto[name] = function (this: Selection, ...args: unknown[]) {
        native = true;
        try {
          return real.apply(this, args);
        } finally {
          native = false;
        }
      };
      restore.push(() => {
        proto[name] = real;
      });
    }
    const deferNative = (event: Event) => {
      if (!native) return;
      event.stopImmediatePropagation();
      setTimeout(() => document.dispatchEvent(new Event('selectionchange')));
    };
    document.addEventListener('selectionchange', deferNative, true);
    const sync = () => {
      editorSelection = selectionOffsets(editor) ?? editorSelection;
    };
    document.addEventListener('selectionchange', sync);
    restore.push(() => {
      document.removeEventListener('selectionchange', deferNative, true);
      document.removeEventListener('selectionchange', sync);
    });

    // The editor pastes over its own selection and cancels the browser's paste.
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = (event as ClipboardEvent).clipboardData!.getData('text/plain');
      const current = paragraph.textContent ?? '';
      const [from, to] = editorSelection;
      paragraph.textContent = `${current.slice(0, from)}${text}${current.slice(to)}`;
      editorSelection = [from + text.length, from + text.length];
    });

    // Native insertText edits at the DOM selection.
    priorExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
    execCommand = vi.fn((_command: string, _showUi: boolean, text: string) => {
      const range = window.getSelection()!.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });

    // The student clicked inside the question (e.g. to fix a typo): both carets sit mid-word.
    const caret = draft.indexOf('cceleration');
    editorSelection = [caret, caret];
  });

  afterEach(() => {
    while (restore.length) restore.pop()!();
    if (priorExecCommand) Object.defineProperty(document, 'execCommand', priorExecCommand);
    else Reflect.deleteProperty(document, 'execCommand');
    document.body.innerHTML = '';
  });

  it('appends the pointer once, after the whole question, when the caret was mid-word', () => {
    expect(claudeAdapter.insertPrompt(pointer, 'append')).toBe(true);
    const text = editor.textContent ?? '';
    console.log('STALE_CARET_APPEND', JSON.stringify({ fallbackCalls: execCommand.mock.calls.length, text }));
    expect(text.split('--- stemLM ---')).toHaveLength(2);
    expect(text.startsWith(draft)).toBe(true);
    expect(text.trimEnd().endsWith('Follow the attached stemLM study guide.')).toBe(true);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('replaces the whole draft on the first paste when the caret was mid-word', () => {
    // One line: happy-dom's innerText drops a newline inside a text node, which would fail the
    // paste check for reasons that have nothing to do with the caret.
    const line = 'Follow the attached stemLM study guide.';
    expect(claudeAdapter.insertPrompt(line, 'replace')).toBe(true);
    const text = editor.textContent ?? '';
    console.log('STALE_CARET_REPLACE', JSON.stringify({ fallbackCalls: execCommand.mock.calls.length, text }));
    expect(text).toBe(line);
    expect(execCommand).not.toHaveBeenCalled();
  });
});
