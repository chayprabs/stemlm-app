import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StemController } from './controller';
import type { PlatformAdapter } from '@/src/platforms/types';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { attachTextFile } from '@/src/lib/file-inject';
import { GUIDE_PASTED_NOTICE, PROTOCOL_FILENAME, composerHasInlineGuide, composerTextHasProtocol } from '@/src/protocol/builder';

vi.mock('@/src/lib/file-inject', async (original) => ({
  ...await original<typeof import('@/src/lib/file-inject')>(),
  attachTextFile: vi.fn(),
}));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/src/lib/last-chat', () => ({ rememberCurrentChat: vi.fn() }));

/**
 * One press of the stemlm button, from the press to the sent message: what the panel does, what
 * the chat is sent, and how the press ends when the chat does not cooperate.
 *
 * The page is a chat box and a thread; the chat "sends" by moving the draft into the thread.
 */
class Chat implements PlatformAdapter {
  readonly id = 'claude' as const;
  readonly label = 'Claude';
  readonly brand = { accent: '#000' };
  readonly layoutRoots = ['main'];
  additiveFileInput = true;
  takesFiles = true;
  writes = true;
  streaming = false;
  matches = () => true;
  findEditor = () => document.getElementById('box');
  acceptsFiles = () => this.takesFiles;
  getEditorText = () => this.findEditor()?.textContent ?? '';
  insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
    if (!this.writes) return false;
    const box = this.findEditor()!;
    box.textContent = mode === 'append' ? `${box.textContent}\n\n${text}` : text;
    return true;
  }
  composerHasAttachments = () => false;
  focusComposerQuestionSlot = () => {};
  getComposerBox = () => document.getElementById('composer');
  getComposerLeadingAnchor = () => null;
  getComposerShell = () => document.getElementById('composer');
  getAssistantBlocks = () => [...document.querySelectorAll<HTMLElement>('[data-testid="assistant-message"]')];
  getLatestAssistantText = () => this.getAssistantBlocks().at(-1)?.textContent ?? '';
  extractCapsules = () => [];
  isStreaming = () => this.streaming;
}

let chat: Chat;
let c: StemController;
const state = () => useStore.getState();
const box = () => document.getElementById('box')!;
const thread = () => document.getElementById('thread')!;

/** The chat shows the uploaded guide as a chip in its composer. */
function showChip(): HTMLElement {
  const chip = Object.assign(document.createElement('div'), { className: 'file-preview', textContent: PROTOCOL_FILENAME });
  document.getElementById('composer')!.prepend(chip);
  return chip;
}

/** The student sends: the draft becomes their message in the thread and the chat box empties. */
function send(): void {
  const turn = Object.assign(document.createElement('div'), { textContent: box().textContent });
  turn.setAttribute('data-testid', 'user-message');
  thread().append(turn);
  box().textContent = '';
  document.querySelector('.file-preview')?.remove();
}

function replyBegins(text = 'Working on it.'): void {
  const turn = Object.assign(document.createElement('div'), { textContent: text });
  turn.setAttribute('data-testid', 'assistant-message');
  thread().append(turn);
}

async function press(question = 'Find the acceleration of a 2 kg block on a 30 degree incline.'): Promise<boolean> {
  box().textContent = question;
  const pressed = c.inject();
  await vi.advanceTimersByTimeAsync(500);
  return pressed;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<main><div id="thread"></div><form id="composer"><div id="box" contenteditable="true"></div></form></main>';
  useStore.setState({
    panelOpen: false, status: 'idle', errorMessage: undefined, buttonInjected: false,
    sessions: [], activeSessionId: undefined, activeStepIndex: 0, settings: DEFAULT_SETTINGS,
  });
  vi.mocked(attachTextFile).mockReset();
  vi.mocked(attachTextFile).mockImplementation(async () => {
    showChip();
    return { ok: true, method: 'input' };
  });
  chat = new Chat();
  c = new StemController(chat, 'file');
  // As the content script wires it: the panel opens for a question, if the student wants that.
  c.setOnAnswerStarted(() => {
    if (state().settings.autoOpenOnAnswer) state().openPanel();
  });
});

afterEach(() => {
  c.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('pressing the stemlm button does not open the panel', () => {
  it('attaches the guide and leaves the page as it was: panel closed, nothing loading', async () => {
    expect(await press()).toBe(true);
    expect(state().buttonInjected).toBe(true);
    expect(composerTextHasProtocol(chat.getEditorText())).toBe(true);
    expect(state().panelOpen).toBe(false);
    expect(state().status).toBe('idle');
    expect(c.takeAttachNotice()).toBeNull();
  });

  it('opens nothing and loads nothing when the question is never sent', async () => {
    await press();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(state().panelOpen).toBe(false);
    expect(state().status).toBe('idle');
    expect(state().buttonInjected).toBe(true);
  });

  it('opens the panel into loading when the question is sent', async () => {
    await press();
    send();
    await vi.advanceTimersByTimeAsync(500);
    expect(state().status).toBe('loading');
    expect(state().panelOpen).toBe(true);
  });

  it('starts loading when the reply begins, where the student\'s own messages cannot be read', async () => {
    await press();
    // Sent, but this chat's markup for the student's message is not one stemLM knows.
    box().textContent = '';
    document.querySelector('.file-preview')?.remove();
    await vi.advanceTimersByTimeAsync(500);
    expect(state().status).toBe('idle');
    expect(state().panelOpen).toBe(false);
    replyBegins();
    await vi.advanceTimersByTimeAsync(500);
    expect(state().status).toBe('loading');
    expect(state().panelOpen).toBe(true);
  });

  it('stays closed when the guide is attached and then removed', async () => {
    await press();
    document.querySelector('.file-preview')!.remove();
    await vi.advanceTimersByTimeAsync(3000);
    expect(state().buttonInjected).toBe(false);
    expect(state().panelOpen).toBe(false);
    expect(state().status).toBe('idle');
    expect(state().errorMessage).toMatch(/removed/i);
    // And a message sent after that, without the guide, is not stemLM's to wait for.
    box().textContent = 'Something else.';
    send();
    replyBegins();
    await vi.advanceTimersByTimeAsync(3000);
    expect(state().panelOpen).toBe(false);
    expect(state().status).toBe('idle');
  });

  it('leaves an open panel open', async () => {
    useStore.setState({ panelOpen: true });
    await press();
    expect(state().panelOpen).toBe(true);
    expect(state().status).toBe('idle');
  });

  it('respects the student\'s choice not to have the panel opened for them', async () => {
    useStore.setState({ settings: { ...DEFAULT_SETTINGS, autoOpenOnAnswer: false } });
    await press();
    send();
    await vi.advanceTimersByTimeAsync(500);
    expect(state().status).toBe('loading');
    expect(state().panelOpen).toBe(false);
  });

  it('is not fooled by an earlier answer that is still being written', async () => {
    replyBegins('An earlier answer, still streaming');
    chat.streaming = true;
    await press();
    thread().lastElementChild!.textContent += ' and more of it';
    await vi.advanceTimersByTimeAsync(3000);
    expect(state().panelOpen).toBe(false);
    expect(state().status).toBe('idle');
  });

  it('does not open the panel to report a failed press either: the button carries the line', async () => {
    chat.writes = false;
    expect(await press()).toBe(false);
    expect(state().status).toBe('error');
    expect(state().panelOpen).toBe(false);
    expect(state().buttonInjected).toBe(false);
    expect(c.takeAttachNotice()).toEqual({ tone: 'error', text: expect.stringMatching(/try again/i) });
    // Read once.
    expect(c.takeAttachNotice()).toBeNull();
  });
});

describe('a press ends, and attaches once', () => {
  it('joins a second press to the first: the guide is uploaded once', async () => {
    let finish!: () => void;
    vi.mocked(attachTextFile).mockImplementationOnce(() => new Promise((resolve) => {
      finish = () => {
        showChip();
        resolve({ ok: true, method: 'input' });
      };
    }));
    box().textContent = 'Find the range of the projectile.';
    const first = c.inject();
    const second = c.inject();
    expect(second).toBe(first);
    finish();
    await vi.advanceTimersByTimeAsync(500);
    expect(await first).toBe(true);
    expect(attachTextFile).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.file-preview')).toHaveLength(1);
    // The next press is a new one.
    send();
    await vi.advanceTimersByTimeAsync(500);
    expect(c.inject()).not.toBe(first);
  });

  it('tries the upload once more when nothing happened, then puts the guide in the message and says so', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    expect(await press()).toBe(true);
    expect(attachTextFile).toHaveBeenCalledTimes(2);
    expect(composerHasInlineGuide(chat.getEditorText())).toBe(true);
    expect(state().buttonInjected).toBe(true);
    expect(state().panelOpen).toBe(false);
    expect(c.takeAttachNotice()).toEqual({ tone: 'info', text: GUIDE_PASTED_NOTICE });
  });

  it('does not repeat an upload that was already a series of tries', async () => {
    chat.additiveFileInput = false;
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    expect(await press()).toBe(true);
    expect(attachTextFile).toHaveBeenCalledTimes(1);
    expect(composerHasInlineGuide(chat.getEditorText())).toBe(true);
  });

  it('does not answer an upload the chat has begun with a second one', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none', started: true });
    expect(await press()).toBe(true);
    expect(attachTextFile).toHaveBeenCalledTimes(1);
  });

  it('confirms the upload by the chat\'s own chip, inside the composer', async () => {
    await press();
    expect(attachTextFile).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      filename: PROTOCOL_FILENAME, requireConfirmation: true, root: document.getElementById('composer'), inputNearRoot: true,
    }));
  });

  // Logged-out ChatGPT answers a file with a login wall: no upload is tried there at all.
  it('sends no file to a composer that cannot take one: the guide goes in as text, with a line saying so', async () => {
    chat.takesFiles = false;
    expect(await press('Why does a capacitor block direct current?')).toBe(true);
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(chat.getEditorText().startsWith('Why does a capacitor block direct current?')).toBe(true);
    expect(composerHasInlineGuide(chat.getEditorText())).toBe(true);
    expect(state().buttonInjected).toBe(true);
    expect(c.takeAttachNotice()).toEqual({ tone: 'info', text: GUIDE_PASTED_NOTICE });
    // No chip is expected, so its absence is not "the guide was removed".
    await vi.advanceTimersByTimeAsync(5000);
    expect(state().buttonInjected).toBe(true);
    expect(state().errorMessage ?? '').not.toMatch(/removed/i);
  });

  it('ends a press the chat never answers, and lets a late answer change nothing', async () => {
    let finish!: () => void;
    vi.mocked(attachTextFile).mockImplementationOnce(() => new Promise((resolve) => {
      finish = () => resolve({ ok: true, method: 'input' });
    }));
    box().textContent = 'Find the range of the projectile.';
    const pressed = c.inject();
    await vi.advanceTimersByTimeAsync(80_000);
    expect(await pressed).toBe(false);
    expect(state().status).toBe('error');
    expect(state().errorMessage).toMatch(/took too long/);
    expect(state().panelOpen).toBe(false);
    expect(c.takeAttachNotice()).toMatchObject({ tone: 'error' });
    finish();
    await vi.advanceTimersByTimeAsync(1000);
    expect(state().buttonInjected).toBe(false);
    expect(chat.getEditorText()).toBe('Find the range of the projectile.');
  });

  it('is on for a later question in the same chat at once, without another file', async () => {
    await press();
    send();
    await vi.advanceTimersByTimeAsync(500);
    // The answer arrives and is read; the student asks the next question in the same chat.
    useStore.setState({ status: 'idle', buttonInjected: false });
    vi.mocked(attachTextFile).mockClear();
    expect(await press('Now find its speed after it has moved 2.0 m.')).toBe(true);
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(state().buttonInjected).toBe(true);
    expect(composerTextHasProtocol(chat.getEditorText())).toBe(true);
    expect(composerHasInlineGuide(chat.getEditorText())).toBe(false);
    expect(c.takeAttachNotice()).toBeNull();
    // No chip was added and none is expected: the reminder is not reported as a removed guide.
    await vi.advanceTimersByTimeAsync(5000);
    expect(state().buttonInjected).toBe(true);
    expect(state().errorMessage ?? '').not.toMatch(/removed/i);
  });
});
