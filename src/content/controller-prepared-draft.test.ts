import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initController, type StemController } from './controller';
import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { handleStemLmPanelMessage } from '@/src/lib/panel-remote';
import { attachTextFile } from '@/src/lib/file-inject';
vi.mock('@/src/lib/file-inject', async (original) => ({
  ...await original<typeof import('@/src/lib/file-inject')>(),
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' })),
}));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/src/lib/last-chat', () => ({ rememberCurrentChat: vi.fn() }));
let controller: StemController;
let editor: HTMLElement;
let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<main><form><div id="prompt-textarea" contenteditable="true">First question</div><button type="button" data-testid="send-button">Send</button></form></main>';
  window.history.replaceState({}, '', '/c/original');
  editor = document.getElementById('prompt-textarea')!;
  send = vi.fn();
  document.querySelector('button')!.addEventListener('click', send);
  vi.spyOn(chatgptAdapter, 'getEditorText').mockImplementation(() => document.getElementById('prompt-textarea')?.textContent ?? '');
  vi.spyOn(chatgptAdapter, 'insertPrompt').mockImplementation((text, mode) => {
    const target = document.getElementById('prompt-textarea')!;
    target.textContent = mode === 'append' ? `${target.textContent}\n\n${text}` : text;
    return true;
  });
  useStore.setState({ buttonInjected: false, sessions: [], panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  controller = initController(chatgptAdapter);
});
afterEach(() => { controller.stopWatching(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

it('recognizes only the exact prepared draft and stages a second question without sending either', async () => {
  expect(await controller.inject()).toBe(true);
  expect(controller.isCurrentDraftInjected()).toBe(true);
  const first = editor.textContent;
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: true });
  expect(attachTextFile).toHaveBeenCalledTimes(1);
  expect(editor.textContent).toBe(first);
  editor.textContent = 'Second question';
  expect(controller.isCurrentDraftInjected()).toBe(false);
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: true });
  expect(attachTextFile).toHaveBeenCalledTimes(2);
  expect(editor.textContent).toContain('Second question');
  expect(controller.isCurrentDraftInjected()).toBe(true);
  expect(send).not.toHaveBeenCalled();
});

it('does not recognize the same text as prepared after the editor is replaced', async () => {
  expect(await controller.inject()).toBe(true);
  expect(controller.isCurrentDraftInjected()).toBe(true);
  editor.replaceWith(editor.cloneNode(true));
  expect(controller.isCurrentDraftInjected()).toBe(false);
});

it('does not recognize the same editor and text as prepared on another route or after reset', async () => {
  expect(await controller.inject()).toBe(true);
  expect(controller.isCurrentDraftInjected()).toBe(true);
  window.history.replaceState({}, '', '/c/different');
  expect(controller.isCurrentDraftInjected()).toBe(false);
  window.history.replaceState({}, '', '/c/original');
  controller.resetInjection();
  useStore.getState().setButtonInjected(true);
  expect(controller.isCurrentDraftInjected()).toBe(false);
});
