import { STUDY_GUIDE_REFERENCE } from '@/src/lib/study-guide';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeAdapter } from '@/src/platforms/claude';
import { attachTextFile } from '@/src/lib/file-inject';
import { buildInjectionPayload, PROTOCOL_FILENAME, STEMLM_SENTINEL } from '@/src/protocol/builder';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { useStore } from '@/src/state/store';
import { initController, type StemController } from './controller';

vi.mock('@/src/lib/file-inject', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/src/lib/file-inject')>(),
  attachTextFile: vi.fn(),
}));
vi.mock('wxt/browser', () => ({
  browser: { storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } } },
}));

let controller: StemController;
let editor: HTMLElement;
let uploads: File[];
let sendEvents: string[];

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({
    settings: { ...DEFAULT_SETTINGS }, sessions: [], activeSessionId: undefined,
    activeStepIndex: 0, status: 'idle', errorMessage: undefined, buttonInjected: false,
    panelOpen: false,
  });
  document.body.innerHTML = '<main><form><fieldset>' +
    '<div class="ProseMirror" contenteditable="true" role="textbox" tabindex="0"><p><br></p></div>' +
    '<input type="file" multiple><button type="button" aria-label="Attach files">+</button>' +
    '<button type="submit" aria-label="Send Message">Send</button></fieldset></form></main>';
  editor = document.querySelector<HTMLElement>('.ProseMirror')!;
  window.getSelection()?.removeAllRanges();
  uploads = [];
  sendEvents = [];
  document.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    sendEvents.push('submit');
  });
  document.querySelector('[aria-label="Send Message"]')!.addEventListener('click', () => sendEvents.push('click'));
  editor.addEventListener('keydown', (event) => { if (event.key === 'Enter') sendEvents.push('Enter'); });
  vi.mocked(attachTextFile).mockImplementation(async (content, options) => {
    uploads.push(new File([content], options?.filename ?? PROTOCOL_FILENAME, { type: 'text/plain' }));
    const chip = document.createElement('div');
    chip.className = 'file-preview';
    chip.textContent = options?.filename ?? PROTOCOL_FILENAME;
    (options?.root as HTMLElement).appendChild(chip);
    return { ok: true, method: 'input' };
  });
  controller = initController(claudeAdapter);
});

afterEach(() => {
  controller?.stopWatching();
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = '';
});

async function expectStagedProtocol(question = '', hasImageAttachment = false): Promise<void> {
  expect(uploads).toHaveLength(1);
  expect(uploads[0]!.name).toBe(PROTOCOL_FILENAME);
  expect(await uploads[0]!.text()).toBe(buildInjectionPayload(question, { hasImageAttachment }).fileContent);
  expect(attachTextFile).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    filename: PROTOCOL_FILENAME, requireConfirmation: true, preserveExisting: hasImageAttachment,
    root: document.querySelector('fieldset'),
  }));
  const text = claudeAdapter.getEditorText();
  expect(text).toContain(STEMLM_SENTINEL);
  expect(text).toContain(STUDY_GUIDE_REFERENCE);
  expect(text.length).toBeLessThan(600);
  expect(text).not.toContain('OUTPUT:');
  expect(sendEvents).toEqual([]);
  expect(useStore.getState().sessions).toEqual([]);
}

describe('Claude empty question staging', () => {
  it('leaves a blank question paragraph above the short pointer without inventing student content', async () => {
    expect(await controller.inject()).toBe(true);
    await expectStagedProtocol();
    expect(claudeAdapter.getEditorText()).not.toContain('The student has not typed a question yet');
    expect(editor.firstElementChild?.textContent?.trim()).toBe('');
    expect(editor.children[1]?.textContent).toBe(STEMLM_SENTINEL);
  });

  it('stays idle with an actionable instruction until the student supplies and sends the question', async () => {
    expect(await controller.inject()).toBe(true);
    await expectStagedProtocol();
    expect(useStore.getState()).toMatchObject({
      status: 'idle', buttonInjected: true,
      errorMessage: 'Instructions attached. Type your question above the stemLM line, then send when ready.',
    });
  });

  it('focuses a collapsed caret in the blank question area before the sentinel', async () => {
    expect(await controller.inject()).toBe(true);
    await expectStagedProtocol();
    expect(document.activeElement).toBe(editor);
    const selection = window.getSelection()!;
    expect(selection.rangeCount).toBe(1);
    expect(selection.isCollapsed).toBe(true);
    const range = selection.getRangeAt(0);
    expect(editor.contains(range.startContainer)).toBe(true);
    const beforeCaret = document.createRange();
    beforeCaret.selectNodeContents(editor);
    beforeCaret.setEnd(range.startContainer, range.startOffset);
    expect(beforeCaret.toString().trim()).toBe('');
    const questionParagraph = editor.firstElementChild!;
    expect(questionParagraph.textContent?.trim()).toBe('');
    const sentinelParagraph = Array.from(editor.children).find((node) => node.textContent === STEMLM_SENTINEL)!;
    const sentinelRange = document.createRange();
    sentinelRange.selectNodeContents(sentinelParagraph);
    expect(range.compareBoundaryPoints(Range.START_TO_START, sentinelRange)).toBeLessThan(0);
  });

  it('keeps the actual problem image and selected file when there is no typed question, without sending', async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="100">' +
      '<text x="12" y="30">Find the current through a 6 ohm resistor</text>' +
      '<text x="12" y="65">connected across a 12 V supply.</text></svg>';
    const problem = new File([source], 'circuit-question.svg', { type: 'image/svg+xml' });
    const selection = new DataTransfer();
    selection.items.add(problem);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    input.files = selection.files;
    const image = document.createElement('img');
    image.src = `data:image/svg+xml,${encodeURIComponent(source)}`;
    image.alt = 'Circuit problem';
    editor.firstElementChild!.appendChild(image);
    expect(claudeAdapter.composerHasAttachments()).toBe(true);
    expect(claudeAdapter.getEditorText()).toBe('');

    expect(await controller.inject()).toBe(true);
    await expectStagedProtocol('', true);
    expect(editor.contains(image)).toBe(true);
    expect(input.files?.[0]).toBe(problem);
    expect(await input.files![0]!.text()).toBe(source);
    expect(claudeAdapter.getEditorText()).toContain('Problem image/PDF is attached');
    expect(claudeAdapter.getEditorText()).not.toContain('The student has not typed a question yet');
    expect(useStore.getState().status).toBe('loading');
  });

  it('preserves a typed question above the pointer and waits for the student to send', async () => {
    const question = 'Explain why momentum is conserved in an isolated collision.';
    editor.firstElementChild!.textContent = question;
    expect(await controller.inject()).toBe(true);
    await expectStagedProtocol(question);
    const text = claudeAdapter.getEditorText();
    expect(text.indexOf(question)).toBe(0);
    expect(text.split(question)).toHaveLength(2);
    expect(text.indexOf(STEMLM_SENTINEL)).toBeGreaterThan(question.length);
    expect(useStore.getState().status).toBe('loading');
  });
});
