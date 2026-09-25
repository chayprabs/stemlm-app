import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeAdapter } from './claude';

function insertAtSelection(text: string): void {
  const selection = window.getSelection()!;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

describe('rich editor handles a cancelled paste', () => {
  let priorExecCommand: PropertyDescriptor | undefined;
  let execCommand: ReturnType<typeof vi.fn>;
  let editor: HTMLElement;
  let paste: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = '<fieldset><div class="ProseMirror" contenteditable="true"><p>Keep this draft.</p></div><div class="attachment-chip">problem.pdf</div><button aria-label="Send Message">Send</button></fieldset>';
    editor = document.querySelector<HTMLElement>('.ProseMirror')!;
    priorExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
    execCommand = vi.fn((_command: string, _showUi: boolean, text: string) => {
      insertAtSelection(text);
      return true;
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    // A rich editor owns insertion, so it cancels the browser's default paste.
    paste = vi.fn((event: Event) => {
      const clipboard = (event as ClipboardEvent).clipboardData;
      event.preventDefault();
      insertAtSelection(clipboard!.getData('text/plain'));
    });
    editor.addEventListener('paste', paste);
  });

  afterEach(() => {
    if (priorExecCommand) Object.defineProperty(document, 'execCommand', priorExecCommand);
    else Reflect.deleteProperty(document, 'execCommand');
    document.body.innerHTML = '';
  });

  it('appends the requested text once when the provider handled and cancelled paste', () => {
    const chip = document.querySelector('.attachment-chip');
    const text = 'Additional instructions.';
    expect(claudeAdapter.insertPrompt(text, 'append')).toBe(true);
    console.log('HANDLED_APPEND', JSON.stringify({
      pasteCalls: paste.mock.calls.length,
      fallbackCalls: execCommand.mock.calls.length,
      text: editor.textContent,
    }));
    expect(paste).toHaveBeenCalledTimes(1);
    expect(editor.textContent?.split(text)).toHaveLength(2);
    expect(editor.textContent).toContain('Keep this draft.');
    expect(document.querySelector('.attachment-chip')).toBe(chip);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('does not replace provider-accepted content a second time after a handled paste', () => {
    const text = 'Replacement instructions.';
    expect(claudeAdapter.insertPrompt(text, 'replace')).toBe(true);
    console.log('HANDLED_REPLACE', JSON.stringify({
      pasteCalls: paste.mock.calls.length,
      fallbackCalls: execCommand.mock.calls.length,
      text: editor.textContent,
    }));
    expect(paste).toHaveBeenCalledTimes(1);
    expect(editor.textContent).toBe(text);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back after a cancelled append did nothing despite an old protocol marker', () => {
    const draft = 'Keep this draft. Earlier stemlm-protocol.txt reference.';
    const text = 'Follow the attached stemlm-protocol.txt. Include every intermediate step.';
    editor.textContent = draft;
    paste.mockImplementation((event: Event) => event.preventDefault());
    expect(claudeAdapter.insertPrompt(text, 'append')).toBe(true);
    console.log('CANCELLED_NOOP_APPEND', JSON.stringify({ fallbackCalls: execCommand.mock.calls.length, text: editor.textContent }));
    expect(editor.textContent).toBe(`${draft}\n\n${text}`);
    expect(execCommand).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.attachment-chip')?.textContent).toBe('problem.pdf');
  });

  it('falls back after a cancelled replacement did nothing despite an old protocol marker', () => {
    editor.textContent = 'Earlier stemlm-protocol.txt reference.';
    const text = 'Follow the attached stemlm-protocol.txt. Include every intermediate step.';
    paste.mockImplementation((event: Event) => event.preventDefault());
    expect(claudeAdapter.insertPrompt(text, 'replace')).toBe(true);
    console.log('CANCELLED_NOOP_REPLACE', JSON.stringify({ fallbackCalls: execCommand.mock.calls.length, text: editor.textContent }));
    expect(editor.textContent).toBe(text);
    expect(execCommand).toHaveBeenCalledTimes(1);
  });

  it('falls back when a cancelled replacement inserts only the filename', () => {
    const text = 'Follow the attached stemlm-protocol.txt. Include every intermediate step.';
    paste.mockImplementation((event: Event) => {
      event.preventDefault();
      insertAtSelection('stemlm-protocol.txt');
    });
    expect(claudeAdapter.insertPrompt(text, 'replace')).toBe(true);
    console.log('CANCELLED_PARTIAL_REPLACE', JSON.stringify({ fallbackCalls: execCommand.mock.calls.length, text: editor.textContent }));
    expect(editor.textContent).toBe(text);
    expect(execCommand).toHaveBeenCalledTimes(1);
  });
});
