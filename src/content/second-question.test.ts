/**
 * A question sent without the stemlm button, in a chat that already has the guide, is answered in
 * the stemLM format too. Its answer is a question of its own: it must never be written over the
 * answer to an earlier question, whose saved copy is refreshed from the session object it shares
 * an id with (src/components/Panel.tsx). So the earlier session object must stay the same object.
 *
 * The page is real DOM in Claude's message markup, read through the real Claude adapter; only the
 * composer is a double.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile } from '@/src/lib/file-inject';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' as const })),
}));

import { StemController } from './controller';
import { claudeAdapter } from '@/src/platforms/claude';
import type { PlatformAdapter } from '@/src/platforms/types';
import { useStore } from '@/src/state/store';

class PageAdapter implements PlatformAdapter {
  id = 'claude' as const;
  label = 'Claude';
  brand = { accent: '#000000' };
  layoutRoots = ['main'];
  editorText = '';
  /** False: a host whose markup for the student's own messages is not recognised. */
  showsStudentTurns = true;

  matches() { return true; }
  findEditor(): HTMLElement | null { return document.getElementById('composer'); }
  getEditorText() { return this.editorText; }
  insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
    this.editorText = mode === 'append' && this.editorText.trim() ? `${this.editorText.trimEnd()}\n\n${text}` : text;
    return true;
  }
  composerHasAttachments() { return false; }
  focusComposerQuestionSlot() {}
  getComposerBox() { return this.findEditor(); }
  getComposerActionRow() { return this.findEditor(); }
  getComposerLayout() { return null; }
  getComposerAnchor() { return this.findEditor(); }
  getComposerLeadingAnchor() { return null; }
  getComposerShell() { return this.findEditor(); }
  getAssistantBlocks() { return claudeAdapter.getAssistantBlocks(); }
  getLatestAssistantText() { return claudeAdapter.getLatestAssistantText(); }
  extractCapsules() { return claudeAdapter.extractCapsules(); }
  getCapsuleSources() { return claudeAdapter.getCapsuleSources!(); }
  isStreaming() { return false; }
  getUserQuestionBefore(block: Element) { return this.showsStudentTurns ? claudeAdapter.getUserQuestionBefore!(block) : ''; }
}

const INCLINE_Q = 'A 5.0 kg block is released on a 30 degree incline with friction 0.20. Find its acceleration.';
const DIVIDER_Q = 'A 12 V source feeds a 2 kΩ and 4 kΩ divider. Find the load voltage.';

function capsule(topic: string, firstStep: string, meta: string[] = []): string {
  return [
    '@meta', 'version: 2', 'subject: Physics', `topic: ${topic}`, ...meta, '@endmeta',
    '@step id=s1', `title: ${firstStep}`, '@body', `Start from what ${topic} gives.`, '@endbody', '@endstep',
    '@step id=s2', 'title: Compute the result', '@body', 'Substitute the numbers and keep the units.', '@endbody', '@endstep',
    '@solution', `The result for ${topic}.`, '@endsolution', '@end',
  ].join('\n');
}

const thread = () => document.getElementById('thread')!;

function studentSends(text: string): void {
  const turn = document.createElement('div');
  turn.setAttribute('data-testid', 'user-message');
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line;
    turn.append(p);
  }
  thread().append(turn);
}

function chatAnswers(raw: string): HTMLElement {
  const turn = document.createElement('div');
  turn.setAttribute('data-testid', 'assistant-message');
  turn.innerHTML = '<pre><code class="language-stemlm"></code></pre>';
  turn.querySelector('code')!.textContent = raw;
  thread().append(turn);
  return turn;
}

let adapter: PageAdapter;
let c: StemController;
const sessions = () => useStore.getState().sessions;

/** The first question: typed, the stemlm button pressed, sent, answered. */
async function askWithButton(question: string, answer: string): Promise<void> {
  adapter.editorText = question;
  const pressed = c.inject();
  await vi.advanceTimersByTimeAsync(300);
  expect(await pressed).toBe(true);
  studentSends(adapter.editorText);
  adapter.editorText = '';
  chatAnswers(answer);
  await vi.advanceTimersByTimeAsync(1_000);
}

/** A later question: typed and sent, the stemlm button never pressed. */
async function askWithoutButton(question: string, answer: string): Promise<void> {
  studentSends(question);
  chatAnswers(answer);
  await vi.advanceTimersByTimeAsync(1_000);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="composer" contenteditable="true"></div><main><div id="thread"></div></main>';
  useStore.setState({
    panelOpen: false, status: 'idle', errorMessage: undefined, view: 'steps', buttonInjected: false,
    sessions: [], activeSessionId: undefined, activeStepIndex: 0,
  });
  vi.mocked(attachTextFile).mockClear();
  adapter = new PageAdapter();
  c = new StemController(adapter);
});

afterEach(() => {
  c.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/** What a model may write in `@meta` when it answers a new question in a chat that has an earlier answer. */
const SECOND_ANSWER_META: Array<[string, string[]]> = [
  ['no qid', []],
  ['the first answer\'s qid and mode: full', ['qid: q1', 'mode: full']],
  ['the first answer\'s qid and no mode', ['qid: q1']],
  ['a qid of its own', ['qid: q2']],
  ['a qid of its own and mode: new', ['qid: q2', 'mode: new']],
];

describe('a second question sent without the stemlm button', () => {
  it.each(SECOND_ANSWER_META)('is a question of its own when its answer carries %s', async (_name, meta) => {
    await askWithButton(INCLINE_Q, capsule('Block on a rough incline', 'Draw the forces', ['qid: q1']));
    const [first] = sessions();
    expect(first?.question).toBe(INCLINE_Q);

    await askWithoutButton(DIVIDER_Q, capsule('Voltage divider', 'Redraw the divider', meta));

    expect(sessions()).toHaveLength(2);
    // The same object: nothing rewrote the first answer, so nothing refreshes its saved copy.
    expect(sessions()[0]).toBe(first);
    expect(sessions()[1]!.question).toBe(DIVIDER_Q);
    expect(sessions()[1]!.capsule.steps[0]!.title).toBe('Redraw the divider');
    expect(useStore.getState().activeSessionId).toBe(sessions()[1]!.id);
  });

  it('is a question of its own even when the model marks its answer as redoing the first one', async () => {
    await askWithButton(INCLINE_Q, capsule('Block on a rough incline', 'Draw the forces', ['qid: q1']));
    const [first] = sessions();

    await askWithoutButton(DIVIDER_Q, capsule('Voltage divider', 'Redraw the divider', ['qid: q1', 'mode: resolve']));

    expect(sessions()).toHaveLength(2);
    expect(sessions()[0]).toBe(first);
    expect(sessions()[1]!.question).toBe(DIVIDER_Q);
  });

  it.each(SECOND_ANSWER_META)('never takes the first question\'s place where the page does not show the student\'s messages (%s)', async (_name, meta) => {
    adapter.showsStudentTurns = false;
    await askWithButton(INCLINE_Q, capsule('Block on a rough incline', 'Draw the forces', ['qid: q1']));
    const [first] = sessions();
    // The question is what was in the chat box when the button was pressed.
    expect(first?.question).toBe(INCLINE_Q);

    await askWithoutButton(DIVIDER_Q, capsule('Voltage divider', 'Redraw the divider', meta));

    expect(sessions()).toHaveLength(2);
    expect(sessions()[0]).toBe(first);
    // Unreadable, so the answer's own topic names it. Never the first question's text.
    expect(sessions()[1]!.question).toBe('Voltage divider');
  });

  it('keeps every earlier answer when two unbuttoned questions get the same topic from the model', async () => {
    adapter.showsStudentTurns = false;
    await askWithButton(INCLINE_Q, capsule('Kinematics', 'Draw the forces'));
    await askWithoutButton('Second question', capsule('Kinematics', 'Second answer'));
    const before = sessions();
    await askWithoutButton('Third question', capsule('Kinematics', 'Third answer'));

    expect(sessions()).toHaveLength(3);
    expect(sessions().slice(0, 2)).toEqual(before);
    expect(sessions().map((s) => s.capsule.steps[0]!.title)).toEqual(['Draw the forces', 'Second answer', 'Third answer']);
  });

  it('names the answer after the student\'s own message when the button was pressed on an empty chat box', async () => {
    const pressed = c.inject();
    await vi.advanceTimersByTimeAsync(300);
    expect(await pressed).toBe(true);
    // The question is typed above stemLM's lines afterwards, then sent.
    studentSends(`${INCLINE_Q}\n${adapter.editorText}`);
    adapter.editorText = '';
    chatAnswers(capsule('Block on a rough incline', 'Draw the forces'));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]!.question).toBe(INCLINE_Q);
  });
});

describe('the same question answered again', () => {
  it('replaces its answer in place when the chat regenerates the reply', async () => {
    await askWithButton(INCLINE_Q, capsule('Block on a rough incline', 'Draw the forces'));
    const [first] = sessions();

    // Regenerate: the same message of the student's, a new reply in place of the old one.
    thread().querySelector('[data-testid="assistant-message"]')!.remove();
    chatAnswers(capsule('Block on a rough incline', 'Resolve the weight first'));
    await vi.advanceTimersByTimeAsync(1_000);

    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]!.id).toBe(first!.id);
    expect(sessions()[0]!.question).toBe(INCLINE_Q);
    expect(sessions()[0]!.capsule.steps[0]!.title).toBe('Resolve the weight first');
  });
});
