/**
 * Plain answers: a chat the model answered in its own words must still open as a study view,
 * labelled as structured and unchecked, without ever being treated as a stemLM capsule.
 *
 * The page is real DOM in Claude's message markup and is read through the real Claude adapter;
 * only the composer is a double, so each test controls the draft and the streaming flag.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachTextFile } from '@/src/lib/file-inject';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: false, method: 'none' as const })),
}));

import { StemController } from './controller';
import { claudeAdapter } from '@/src/platforms/claude';
import type { PlatformAdapter } from '@/src/platforms/types';
import type { Session } from '@/src/protocol/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { buildComposerAppendix } from '@/src/protocol/builder';
import { NO_ANSWER_NOTICE, useStore } from '@/src/state/store';

const CAPSULE = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');
const STUB = buildComposerAppendix({ hasQuestion: true });
const REFUSAL = "I'm sorry, but I can't help with that request.";

class PageAdapter implements PlatformAdapter {
  id = 'claude' as const;
  label = 'Claude';
  brand = { accent: '#000000' };
  layoutRoots = ['main'];
  editorText = '';
  streaming = false;

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
  isStreaming() { return this.streaming; }
  getUserQuestionBefore(block: Element) { return claudeAdapter.getUserQuestionBefore!(block); }
}

/** A worked answer about `subject`: three "Step n" headings, each with its own sentence. */
function worked(subject: string): string {
  return [
    `<p>Here is how to find ${subject}, one stage at a time.</p>`,
    `<h3>Step 1: Write what is given for ${subject}</h3>`,
    `<p>List every quantity in the problem with its unit, and name the unknown that ${subject} asks for.</p>`,
    '<h3>Step 2: Choose the relation</h3>',
    '<p>Pick the law that connects the givens to the unknown and solve it for the unknown before any numbers go in.</p>',
    '<h3>Step 3: Substitute and compute</h3>',
    `<p>Put the numbers in with their units, carry the units through, and round the result for ${subject} at the end.</p>`,
  ].join('');
}

const thread = () => document.getElementById('thread')!;

function ask(text: string): void {
  const turn = document.createElement('div');
  turn.setAttribute('data-testid', 'user-message');
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    p.textContent = line;
    turn.append(p);
  }
  thread().append(turn);
}

function reply(html: string): HTMLElement {
  const turn = document.createElement('div');
  turn.setAttribute('data-testid', 'assistant-message');
  turn.innerHTML = `<div class="standard-markdown">${html}</div>`;
  thread().append(turn);
  return turn;
}

function replyCapsule(raw: string): HTMLElement {
  const turn = document.createElement('div');
  turn.setAttribute('data-testid', 'assistant-message');
  turn.innerHTML = '<pre><code class="language-stemlm"></code></pre>';
  turn.querySelector('code')!.textContent = raw;
  thread().append(turn);
  return turn;
}

let adapter: PageAdapter;
let c: StemController;

beforeEach(() => {
  document.body.innerHTML = '<div id="composer" contenteditable="true"></div><main><div id="thread"></div></main>';
  useStore.setState({
    panelOpen: false, status: 'idle', errorMessage: undefined, view: 'steps', buttonInjected: false,
    sessions: [], activeSessionId: undefined, activeStepIndex: 0,
  });
  vi.mocked(attachTextFile).mockReset();
  vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
  adapter = new PageAdapter();
  c = new StemController(adapter);
});

afterEach(() => {
  c.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const sessions = () => useStore.getState().sessions;

describe('Load conversation on a chat that was answered without stemLM', () => {
  it('builds a session from the plain answer, marked as ingest, with the question it answers', async () => {
    ask('What is the range of the projectile?');
    reply(worked('the range'));

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    const [session] = sessions();
    expect(session?.origin).toBe('ingest');
    expect(session?.question).toBe('What is the range of the projectile?');
    expect(session?.capsule.meta.question).toBe('What is the range of the projectile?');
    expect(session?.capsule.steps.map((s) => s.title)).toEqual([
      'Write what is given for the range', 'Choose the relation', 'Substitute and compute',
    ]);
    // The raw text is the answer's Markdown, not a capsule.
    expect(session?.raw).toContain('### Step 1: Write what is given for the range');
    expect(session?.raw).not.toContain('@meta');
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBeUndefined();
    expect(useStore.getState().activeSessionId).toBe(session?.id);
  });

  it('never presents the answer as checked', async () => {
    ask('Find the range.');
    reply(worked('the range'));
    await c.loadConversation({ maxWaitMs: 0 });
    const { capsule } = sessions()[0]!;
    expect(capsule.verification).toBeUndefined();
    expect(capsule.uncertainty).toBeUndefined();
    expect(capsule.steps.some((s) => s.quickCheck || s.takeaway)).toBe(false);
  });

  it('falls back to the answer\'s own topic when the page shows no user turn', async () => {
    reply(worked('the range'));
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    const [session] = sessions();
    expect(session?.question).toBe(session?.capsule.meta.topic);
    expect(session?.question).not.toBe('');
  });

  it('keeps stemLM\'s stub out of the question when the guide was sent with it', async () => {
    ask(`Find the range of the projectile.\n${STUB}`);
    reply(worked('the range'));
    await c.loadConversation({ maxWaitMs: 0 });
    expect(sessions()[0]?.question).toBe('Find the range of the projectile.');
  });

  it('opens the five most recent answers in page order, the newest active', async () => {
    for (let n = 1; n <= 7; n++) {
      ask(`Question ${n}?`);
      reply(worked(`quantity ${n}`));
    }
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(5);
    expect(sessions().map((s) => s.question)).toEqual(['Question 3?', 'Question 4?', 'Question 5?', 'Question 6?', 'Question 7?']);
    expect(useStore.getState().activeSessionId).toBe(sessions()[4]?.id);
    // Created in one pass, yet ordered: shared tabs sort sessions by creation time.
    const stamps = sessions().map((s) => s.createdAt);
    expect([...stamps].sort((a, b) => a - b)).toEqual(stamps);
    expect(new Set(stamps).size).toBe(5);
  });

  it('skips replies that are not answers without spending the cap on them', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    ask('Thanks');
    reply('<p>You are welcome.</p>');
    ask('Second?');
    reply(worked('the second quantity'));
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(2);
    expect(sessions().map((s) => s.question)).toEqual(['First?', 'Second?']);
  });

  it('leaves a chat that has a capsule exactly as before: the capsule loads, plain answers do not', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    ask('Second?');
    replyCapsule(CAPSULE);
    ask('Third?');
    reply(worked('the third quantity'));

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.origin).toBeUndefined();
    expect(sessions()[0]?.raw).toContain('@meta');
  });

  it('does not fall back to plain answers when the chat\'s capsule is unreadable', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    replyCapsule(CAPSULE.replace(/\n@end\s*$/, ''));
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(0);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/incomplete|couldn't read/i);
  });

  it('never structures the guide or the stub echoed back by the chat', async () => {
    ask('Find the range.');
    reply(`${worked('the range')}<p>--- stemLM ---</p><p>Follow the attached stemLM study guide.</p>`);
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(0);
    expect(sessions()).toHaveLength(0);
  });

  it('never structures the message that is still being written', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    ask('Second?');
    reply(worked('the second quantity'));
    adapter.streaming = true;
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    expect(sessions().map((s) => s.question)).toEqual(['First?']);
  });

  it('says the chat is still writing instead of claiming there is nothing to study', async () => {
    vi.useFakeTimers();
    ask('Only?');
    const turn = reply(worked('the only quantity'));
    adapter.streaming = true;
    const loading = c.loadConversation({ maxWaitMs: 900 });
    for (let i = 0; i < 4; i++) {
      turn.querySelector('.standard-markdown')!.insertAdjacentHTML('beforeend', `<p>More text ${i}.</p>`);
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(await loading).toBe(0);
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toMatch(/still writing/);
  });

  it('reports a chat with nothing to study, and not as an unreadable answer', async () => {
    ask('Write my report.');
    reply(`<p>${REFUSAL}</p>`);
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(0);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/No answer to study/);
    expect(useStore.getState().errorMessage).not.toMatch(/couldn't read|Parser code/);
  });

  it('changes nothing when asked quietly and nothing is found', async () => {
    reply(`<p>${REFUSAL}</p>`);
    expect(await c.loadConversation({ maxWaitMs: 0, quiet: true })).toBe(0);
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('waits for a second look before reading plain answers, so a page still rendering is not cut short', async () => {
    vi.useFakeTimers();
    ask('First?');
    reply(worked('the first quantity'));
    const loading = c.loadConversation({ maxWaitMs: 2_000 });
    await vi.advanceTimersByTimeAsync(100);
    expect(sessions()).toHaveLength(0);
    ask('Second?');
    reply(worked('the second quantity'));
    await vi.advanceTimersByTimeAsync(900);
    expect(await loading).toBe(2);
  });

  it('gives capsules time to render in a chat where the guide was sent', async () => {
    vi.useFakeTimers();
    ask(`Find the current.\n${STUB}`);
    reply(worked('the current'));
    const loading = c.loadConversation({ maxWaitMs: 6_000 });
    await vi.advanceTimersByTimeAsync(1_200);
    expect(sessions()).toHaveLength(0);
    replyCapsule(CAPSULE);
    await vi.advanceTimersByTimeAsync(600);
    expect(await loading).toBe(1);
    expect(sessions()[0]?.origin).toBeUndefined();
  });

  it('structures the plain reply to a sent guide once no capsule has appeared', async () => {
    vi.useFakeTimers();
    ask(`Find the current.\n${STUB}`);
    reply(worked('the current'));
    const loading = c.loadConversation({ maxWaitMs: 6_000 });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await loading).toBe(1);
    expect(sessions()[0]?.origin).toBe('ingest');
    expect(sessions()[0]?.question).toBe('Find the current.');
  });
});

describe('what an empty panel is offered', () => {
  it('a plain answer when the chat holds no capsule', () => {
    ask('Find the range.');
    reply(worked('the range'));
    expect(c.conversationToLoad()).toBe('answer');
    expect(c.hasConversationToLoad()).toBe(true);
  });

  it('stemLM answers when the chat has any, whatever else it holds', () => {
    reply(worked('the first quantity'));
    replyCapsule(CAPSULE);
    reply(worked('the last quantity'));
    expect(c.conversationToLoad()).toBe('capsules');
  });

  it('nothing for a refusal, a short reply or an empty chat', () => {
    expect(c.conversationToLoad()).toBeNull();
    reply(`<p>${REFUSAL}</p>`);
    expect(c.conversationToLoad()).toBeNull();
    expect(c.hasConversationToLoad()).toBe(false);
  });

  it('the worked answer above a short closing reply, and opening it loads that answer', async () => {
    ask('Find the range.');
    reply(worked('the range'));
    ask('Thanks!');
    reply('<p>You are welcome. Good luck with the rest of the problem set.</p>');
    expect(c.conversationToLoad()).toBe('answer');

    expect(await c.loadConversation({ maxWaitMs: 0, quiet: true })).toBe(1);
    expect(sessions()[0]).toMatchObject({ origin: 'ingest', question: 'Find the range.' });
  });

  it('nothing while a new reply is being written below an earlier answer', () => {
    ask('Find the range.');
    reply(worked('the range'));
    ask('And the time of flight?');
    reply('<p>The time of flight follows from</p>');
    adapter.streaming = true;
    expect(c.conversationToLoad()).toBeNull();
  });

  it('an earlier reply that finishes rendering after the first look', () => {
    ask('Find the range.');
    const earlier = reply('<p>One moment.</p>');
    ask('Thanks!');
    reply('<p>You are welcome.</p>');
    expect(c.conversationToLoad()).toBeNull();
    earlier.querySelector('.standard-markdown')!.innerHTML = worked('the range');
    expect(c.conversationToLoad()).toBe('answer');
  });

  it('nothing while the latest reply is still being written, then the answer once it has finished', () => {
    ask('Find the range.');
    reply(worked('the range'));
    adapter.streaming = true;
    expect(c.conversationToLoad()).toBeNull();
    adapter.streaming = false;
    expect(c.conversationToLoad()).toBe('answer');
  });

  it('follows the page: a reply that grows into an answer is seen on the next look', () => {
    ask('Find the range.');
    const turn = reply('<p>Let me work through it.</p>');
    expect(c.conversationToLoad()).toBeNull();
    turn.querySelector('.standard-markdown')!.innerHTML = worked('the range');
    expect(c.conversationToLoad()).toBe('answer');
    turn.remove();
    expect(c.conversationToLoad()).toBeNull();
  });

  it('nothing once the panel holds a session', async () => {
    reply(worked('the range'));
    await c.loadConversation({ maxWaitMs: 0 });
    expect(c.conversationToLoad()).toBeNull();
  });

  it('the legacy offer when only the sent guide is on the page', () => {
    ask(`Find the current.\n${STUB}`);
    expect(c.conversationToLoad()).toBe('capsules');
  });
});

describe('ingest sessions are never matched or re-parsed as capsule text', () => {
  it('reloading the same chat keeps each session\'s identity and follow-ups', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    ask('Second?');
    reply(worked('the second quantity'));
    await c.loadConversation({ maxWaitMs: 0 });
    const before = sessions();
    useStore.getState().addFollowup(before[0]!.id, {
      id: 'fu-1', anchorStepId: before[0]!.capsule.steps[0]!.id, question: 'Why?', capsule: before[0]!.capsule, createdAt: 1,
    });

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(2);
    const after = sessions();
    expect(after.map((s) => s.id)).toEqual(before.map((s) => s.id));
    expect(after[0]?.followups?.map((f) => f.id)).toEqual(['fu-1']);
    expect(after.every((s) => s.origin === 'ingest')).toBe(true);
  });

  it('matches a session restored without its text (mirrored tab, reload backup) by its shape', async () => {
    ask('First?');
    reply(worked('the first quantity'));
    await c.loadConversation({ maxWaitMs: 0 });
    const restored = { ...sessions()[0]!, raw: '' };
    useStore.setState({ sessions: [restored], activeSessionId: restored.id });

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.id).toBe(restored.id);
    expect(sessions()[0]?.raw).not.toBe('');
  });

  it('keeps sessions the page does not show (LOAD-01)', async () => {
    reply(worked('the first quantity'));
    await c.loadConversation({ maxWaitMs: 0 });
    const other: Session = { ...sessions()[0]!, id: 'from-another-chat', raw: 'Another answer entirely.', origin: 'ingest',
      capsule: { ...sessions()[0]!.capsule, meta: { ...sessions()[0]!.capsule.meta, topic: 'Another chat' } } };
    useStore.setState({ sessions: [other, ...sessions()] });
    await c.loadConversation({ maxWaitMs: 0 });
    expect(sessions().map((s) => s.id)).toContain('from-another-chat');
    expect(sessions()).toHaveLength(2);
  });

  it('a capsule on the page never adopts an ingest session, even one whose raw text is that capsule', async () => {
    replyCapsule(CAPSULE);
    await c.loadConversation({ maxWaitMs: 0 });
    const loaded = sessions()[0]!;
    // The worst case for a raw-text comparison: an ingest session carrying capsule-looking text.
    const impostor: Session = { ...loaded, id: 'ingest-impostor', origin: 'ingest', followups: [
      { id: 'fu-x', anchorStepId: 's1', capsule: loaded.capsule, createdAt: 1 },
    ] };
    useStore.setState({ sessions: [impostor], activeSessionId: impostor.id });

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    const capsuleSession = sessions().find((s) => s.origin !== 'ingest');
    expect(capsuleSession?.id).not.toBe('ingest-impostor');
    expect(capsuleSession?.followups).toBeUndefined();
    expect(sessions().map((s) => s.id)).toContain('ingest-impostor');
  });
});

/** Type a question, press the stemlm button (the guide goes in as text here), and "send" it. */
async function sendWithGuide(question: string): Promise<void> {
  adapter.editorText = question;
  const injected = c.inject();
  await vi.advanceTimersByTimeAsync(100);
  expect(await injected).toBe(true);
  // Attached, not sent: the panel does not wait for an answer yet.
  expect(useStore.getState().status).not.toBe('loading');
  ask(`${question}\n${STUB}`);
  adapter.editorText = '';
  // Sent: the student's message, carrying stemLM's lines, is in the thread.
  await vi.advanceTimersByTimeAsync(400);
  expect(useStore.getState().status).toBe('loading');
}

describe('capture fallback: the chat answered a stemLM question in its own words', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('structures the finished answer and says so with an info line, not an error', async () => {
    await sendWithGuide('Find the range of the projectile.');
    reply(worked('the range'));
    await vi.advanceTimersByTimeAsync(11_000);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.origin).toBe('ingest');
    expect(state.sessions[0]?.question).toBe('Find the range of the projectile.');
    expect(state.status).toBe('ready');
    // No status line: the panel says where the answer came from under its question, once.
    expect(state.errorMessage).toBeUndefined();
    expect(state.buttonInjected).toBe(false);
    expect(state.activeSessionId).toBe(state.sessions[0]?.id);
  });

  it('waits for the reply to stop changing: nothing is structured while it is being written', async () => {
    await sendWithGuide('Find the range.');
    reply(worked('the range'));
    adapter.streaming = true;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().status).toBe('loading');
    adapter.streaming = false;
    await vi.advanceTimersByTimeAsync(3_000);
    expect(sessions()).toHaveLength(1);
  });

  // A refusal or a usage limit is the chat's reply, not a failure of stemLM's: a note, not an error.
  it('says so in a note, not an error, when the reply is not an answer', async () => {
    await sendWithGuide('Find the range.');
    reply(`<p>${REFUSAL} You have reached your usage limit for today.</p>`);
    await vi.advanceTimersByTimeAsync(11_000);

    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
    expect(NO_ANSWER_NOTICE).toMatch(/without stemLM steps/i);
    // One line for the student: no parser code under it.
    expect(NO_ANSWER_NOTICE).not.toMatch(/\n|parser|capsule/i);
    expect(sessions()).toHaveLength(0);
  });

  it('recovers when that reply is then replaced by a worked answer', async () => {
    await sendWithGuide('Find the range.');
    const turn = reply('<p>One moment while I think about this problem.</p>');
    await vi.advanceTimersByTimeAsync(11_000);
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);

    turn.querySelector('.standard-markdown')!.innerHTML = worked('the range');
    await vi.advanceTimersByTimeAsync(12_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.origin).toBe('ingest');
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('does not change what happens to an incomplete capsule', async () => {
    await sendWithGuide('Find the current from the battery.');
    replyCapsule(CAPSULE.replace(/@end\s*$/, '').replace(/@verify[\s\S]*$/, '@step id=s9\ntitle: Verify\n@body\nCurrents through the'));
    await vi.advanceTimersByTimeAsync(25_000);
    expect(sessions().map((s) => [s.cutOff, s.origin])).toEqual([[true, undefined]]);
    expect(useStore.getState().errorMessage).toMatch(/stopped before the end/);
  });

  it('ignores an answer that was already on the page when the guide was attached', async () => {
    ask('An earlier question.');
    const earlier = reply(worked('the earlier quantity'));
    await sendWithGuide('Find the range.');
    // The host re-renders the old answer (late math, an edit) while the new one has not arrived.
    earlier.querySelector('.standard-markdown')!.insertAdjacentHTML('beforeend', '<p>Rendered late.</p>');
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
  });

  it('adds beside a stemLM answer to the same question rather than replacing it', async () => {
    const question = 'Find the current from the battery.';
    replyCapsule(CAPSULE);
    await c.loadConversation({ maxWaitMs: 0 });
    const capsuleSession = sessions()[0]!;
    useStore.setState({ sessions: [{ ...capsuleSession, question }] });
    thread().replaceChildren();

    await sendWithGuide(question);
    reply(worked('the current'));
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions().map((s) => s.origin)).toEqual([undefined, 'ingest']);
    expect(sessions()[0]?.capsule).toBe(capsuleSession.capsule);
  });

  it('replaces its own earlier structured answer when the same question is asked again', async () => {
    await sendWithGuide('Find the range.');
    reply(worked('the range'));
    await vi.advanceTimersByTimeAsync(11_000);
    const first = sessions()[0]!;

    await sendWithGuide('Find the range.');
    reply(worked('the range, a second time'));
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.id).toBe(first.id);
    expect(sessions()[0]?.raw).toContain('a second time');
  });

  it('gives way to a stemLM answer when the retry comes back in the format', async () => {
    const question = 'Find the current from the battery.';
    await sendWithGuide(question);
    reply(worked('the current'));
    await vi.advanceTimersByTimeAsync(11_000);
    const structured = sessions()[0]!;
    expect(structured.origin).toBe('ingest');

    await sendWithGuide(question);
    replyCapsule(CAPSULE);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.id).toBe(structured.id);
    expect(sessions()[0]?.origin).toBeUndefined();
    expect(sessions()[0]?.raw).toContain('@meta');
  });

  it('structures a plain reply that arrives below an earlier stemLM answer', async () => {
    ask('An earlier question.');
    replyCapsule(CAPSULE);
    await c.loadConversation({ maxWaitMs: 0 });
    expect(sessions()).toHaveLength(1);

    adapter.editorText = 'Find the range of the projectile.';
    const injected = c.inject();
    await vi.advanceTimersByTimeAsync(100);
    expect(await injected).toBe(true);
    ask(`Find the range of the projectile.\n${STUB}`);
    adapter.editorText = '';
    reply(worked('the range'));
    await vi.advanceTimersByTimeAsync(12_000);

    expect(sessions().map((s) => s.origin)).toEqual([undefined, 'ingest']);
    expect(sessions()[1]?.question).toBe('Find the range of the projectile.');
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('never opens an Ask-in-chat reply as a session of its own', async () => {
    reply(worked('the first quantity'));
    await c.loadConversation({ maxWaitMs: 0 });
    const session = sessions()[0]!;
    const followed = c.followUp('Why is the unit carried through?', session.capsule.steps[0]!.title, 'Physics', {
      anchor: { sessionId: session.id, anchorStepId: session.capsule.steps[0]!.id },
    });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await followed).toBe(true);
    ask(`Why is the unit carried through?\n${STUB}`);
    reply(worked('the follow-up'));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.followups).toBeUndefined();
  });

  it('reports a plain reply to an unanchored follow-up as before, without a session for it', async () => {
    reply(worked('the first quantity'));
    await c.loadConversation({ maxWaitMs: 0 });
    const followed = c.followUp('Why is the unit carried through?', undefined, 'Physics');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await followed).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    ask(`Why is the unit carried through?\n${STUB}`);
    reply(worked('the follow-up'));
    await vi.advanceTimersByTimeAsync(12_000);
    expect(sessions()).toHaveLength(1);
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
  });

  it('a stemLM answer that replaces a structured one in place is a stemLM session again', async () => {
    // Same question as the capsule states, so the follow-up answer replaces the active session.
    ask('Structural fixture — not a stored solution.');
    reply(worked('the circuit'));
    await c.loadConversation({ maxWaitMs: 0 });
    const structured = sessions()[0]!;
    expect(structured.origin).toBe('ingest');

    const followed = c.followUp('Redo this with the stemlm format.', undefined, 'Electrical');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await followed).toBe(true);
    replyCapsule(CAPSULE);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.id).toBe(structured.id);
    expect(sessions()[0]?.origin).toBeUndefined();
    expect('origin' in sessions()[0]!).toBe(false);
    expect(sessions()[0]?.raw).toContain('@meta');
  });
});

describe('capture fallback when the guide was attached to an empty chat box', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  async function attachFirst(): Promise<void> {
    vi.mocked(attachTextFile).mockResolvedValueOnce({ ok: true, method: 'input' });
    adapter.editorText = '';
    const injected = c.inject();
    await vi.advanceTimersByTimeAsync(200);
    expect(await injected).toBe(true);
    expect(useStore.getState().status).toBe('idle');
  }

  it('structures the reply to the turn that carries stemLM\'s stub', async () => {
    await attachFirst();
    ask(`Find the range of the projectile.\n${STUB}`);
    adapter.editorText = '';
    reply(worked('the range'));
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.origin).toBe('ingest');
    expect(sessions()[0]?.question).toBe('Find the range of the projectile.');
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('leaves a reply alone when the turn it answers was sent without the guide', async () => {
    await attachFirst();
    ask('Something else entirely, typed after removing the guide.');
    adapter.editorText = '';
    reply(worked('something else'));
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().status).toBe('idle');
  });

  // The panel used not to wait in this flow, because it could not tell when the question was
  // sent. It can now (the message carrying stemLM's lines appears), so it waits, and reports a
  // reply that is not an answer exactly as it does for a question typed first.
  it('reports a reply that is not an answer, once the question was sent with the guide', async () => {
    await attachFirst();
    ask(`Find the range.\n${STUB}`);
    adapter.editorText = '';
    await vi.advanceTimersByTimeAsync(400);
    expect(useStore.getState().status).toBe('loading');
    reply(`<p>${REFUSAL}</p>`);
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
  });
});

describe('a stemLM patch never rewrites an answer structured from the chat', () => {
  const PATCH = [
    '@meta', 'version: 2', 'subject: Physics', 'topic: Range', 'mode: patch', '@endmeta',
    '@patch op=replace id=s2', '@step id=s2', 'title: Replaced by a patch', '@body', 'Patched body.', '@endbody', '@endstep', '@endpatch',
    '@verify', 'methods: units', 'status: pass', 'notes: checked', '@endverify',
    '@end',
  ].join('\n');

  it('refuses the patch and leaves the session as it was, with nothing marked as checked', async () => {
    ask('Find the range.');
    reply(worked('the range'));
    await c.loadConversation({ maxWaitMs: 0 });
    const before = sessions()[0]!;
    expect(before.capsule.steps.some((s) => s.id === 's2')).toBe(true);

    replyCapsule(PATCH);
    await new Promise((r) => setTimeout(r, 600));

    const after = sessions()[0]!;
    expect(sessions()).toHaveLength(1);
    expect(after.capsule).toBe(before.capsule);
    expect(after.raw).toBe(before.raw);
    expect(after.origin).toBe('ingest');
    expect(after.capsule.verification).toBeUndefined();
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/couldn't apply this change/);
    expect(useStore.getState().errorMessage).toMatch(/arranged from a plain chat answer/);
  });
});

// Finding 13: a finished reply sat under "Reading response" for ten seconds because only quiet was
// measured. A chat that showed it was writing and has stopped showing it has finished.
describe('a reply the chat has visibly finished is not kept waiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /** The chat shows its Stop control while it writes `html`, then takes it away. */
  async function chatWrites(html: string): Promise<void> {
    adapter.streaming = true;
    reply(html);
    await vi.advanceTimersByTimeAsync(1_500);
    adapter.streaming = false;
  }

  it('opens a plain worked answer about two seconds after the chat stops writing', async () => {
    await sendWithGuide('Find the range.');
    await chatWrites(worked('the range'));
    expect(sessions()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sessions()).toHaveLength(1);
    expect(sessions()[0]?.origin).toBe('ingest');
    expect(useStore.getState().status).toBe('ready');
  });

  it('says a refusal is not an answer about two seconds after the chat stops writing', async () => {
    await sendWithGuide('Find the range.');
    await chatWrites(`<p>${REFUSAL}</p>`);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
  });

  it('does so for a short reply that was whole, with the Stop control already gone, before it was first seen', async () => {
    await sendWithGuide('Find the range.');
    // The chat shows Stop while it thinks; nothing of the reply is on the page yet.
    adapter.streaming = true;
    thread().append(document.createElement('span'));
    await vi.advanceTimersByTimeAsync(600);
    adapter.streaming = false;
    reply(`<p>${REFUSAL}</p>`);
    await vi.advanceTimersByTimeAsync(2_500);
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().errorMessage).toBe(NO_ANSWER_NOTICE);
  });

  it('keeps waiting while the chat still shows that it is writing', async () => {
    await sendWithGuide('Find the range.');
    adapter.streaming = true;
    reply(`<p>${REFUSAL}</p>`);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(useStore.getState().status).toBe('loading');
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('still allows ten quiet seconds where the chat never showed that it was writing', async () => {
    await sendWithGuide('Find the range.');
    reply(worked('the range'));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sessions()).toHaveLength(0);
    expect(useStore.getState().status).toBe('loading');
    await vi.advanceTimersByTimeAsync(6_000);
    expect(sessions()).toHaveLength(1);
  });

  it('does not take what the chat showed for an earlier reply as the end of the next one', async () => {
    await sendWithGuide('Find the range.');
    await chatWrites(worked('the range'));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sessions()).toHaveLength(1);

    // The next question; this time the chat shows nothing while it writes, and pauses mid-reply.
    await sendWithGuide('Find the maximum height.');
    const turn = reply('<p>Here is how to find the maximum height, one stage at a time.</p>');
    await vi.advanceTimersByTimeAsync(4_000);
    expect(useStore.getState().status).toBe('loading');
    turn.querySelector('.standard-markdown')!.innerHTML = worked('the maximum height');
    await vi.advanceTimersByTimeAsync(11_000);
    expect(sessions()).toHaveLength(2);
  });
});
