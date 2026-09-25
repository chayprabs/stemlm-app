import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initController, type StemController } from './controller';
import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { attachTextFile } from '@/src/lib/file-inject';

vi.mock('@/src/lib/file-inject', async (original) => ({
  ...await original<typeof import('@/src/lib/file-inject')>(),
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' as const })),
}));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/src/lib/last-chat', () => ({ rememberCurrentChat: vi.fn() }));
vi.mock('@/src/lib/figure/compile', () => ({ compileDiagramSpec: vi.fn() }));

describe('attachment completion lifecycle', () => {
  let controller: StemController;
  let editor: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<main><form><div id="prompt-textarea" contenteditable="true">A question</div></form></main>';
    window.history.replaceState({}, '', '/c/attachment');
    editor = document.getElementById('prompt-textarea')!;
    vi.spyOn(chatgptAdapter, 'getEditorText').mockImplementation(() => editor.textContent ?? '');
    vi.spyOn(chatgptAdapter, 'insertPrompt').mockImplementation((text, mode) => {
      editor.textContent = mode === 'append' ? `${editor.textContent}\n${text}` : text;
      return true;
    });
    useStore.setState({ buttonInjected: false, sessions: [], panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
    controller = initController(chatgptAdapter);
  });

  afterEach(() => {
    controller.stopWatching();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('reports success only after confirmed upload and composer text insertion', async () => {
    vi.mocked(attachTextFile).mockResolvedValueOnce({ ok: true, method: 'input' });
    const result = await controller.inject();
    expect(result).toBe(true);
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(editor.textContent).toContain('stemLM');
  });

  it('rejects a confirmed upload when the composer text is an arbitrary short stub', async () => {
    vi.mocked(attachTextFile).mockResolvedValueOnce({ ok: true, method: 'input' });
    vi.spyOn(chatgptAdapter, 'insertPrompt').mockImplementation((_text, _mode) => {
      editor.textContent = 'short question stub';
      return true;
    });
    expect(await controller.inject()).toBe(false);
    expect(useStore.getState().buttonInjected).toBe(false);
  });

  it('cancels an upload completion after the extension is disabled', async () => {
    let finish!: (value: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = controller.inject();
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, stemlmEnabled: false } });
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(useStore.getState().buttonInjected).toBe(false);
  });

  it('cancels an upload completion after navigation changes the active route', async () => {
    let finish!: (value: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = controller.inject();
    window.history.replaceState({}, '', '/c/new-thread');
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(useStore.getState().buttonInjected).toBe(false);
  });

  it('cancels an upload completion after the host replaces the composer editor', async () => {
    let finish!: (value: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = controller.inject();
    editor.replaceWith(editor.cloneNode(true));
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(useStore.getState().buttonInjected).toBe(false);
  });
});
