/**
 * D38 (LIVE-08b): a reply the chat stopped writing (no @end, stable past the stall) shows the steps
 * that closed, marked incomplete; the finished reply, or a continuation that brings only the
 * missing steps, replaces it in place. Live Grok 2026-09-27 stopped mid-step 6 of a full answer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiAdapter } from '@/src/platforms/gemini';
import { useStore } from '@/src/state/store';
import { StemController } from './controller';

const META = [
  '@meta', 'version: 2', 'subject: Electrical', 'topic: Series-parallel circuit',
  'question: Find the battery current and the voltage across each resistor.', 'qid: q1', 'mode: full', '@endmeta',
];
const step = (n: number, title: string, body: string) =>
  [`@step id=s${n}`, `title: ${title}`, '@body', body, '@endbody', '@endstep'];
const S1 = step(1, 'Combine the parallel pair', 'With $R_2=6\\,\\Omega$ and $R_3=3\\,\\Omega$: $R_p=2\\,\\Omega$.');
const S2 = step(2, 'Find the battery current', 'With $V=12\\,\\text{V}$ and $R=6\\,\\Omega$: $I=2\\,\\text{A}$.');
const S3 = step(3, 'Verify by the current split', 'The branch currents $4/6$ and $4/3$ add to $2\\,\\text{A}$.');
const CLOSING = [
  '@verify', 'methods: conservation', 'status: pass', 'notes: 4/6 + 4/3 = 2 A recovers the battery current.', '@endverify',
  '@uncertainty', 'assumption: ideal wires', 'low_confidence: none', 'check: none', '@enduncertainty',
  '@solution', 'The battery supplies $2\\,\\text{A}$.', '@endsolution', '@end',
];
const FULL = [...META, ...S1, ...S2, ...S3, ...CLOSING].join('\n');
/** The chat stopped inside step 3: steps 1 and 2 closed. */
const CUT = [...META, ...S1, ...S2, '@step id=s3', 'title: Verify by the current split', '@body', 'The branch currents'].join('\n');

/** Gemini page showing `text` as one model response. */
function page(text: string) {
  document.body.innerHTML = '<main></main>';
  addReply(text);
}

/** A new model response below the existing ones, as the chat renders the next reply. */
function addReply(text: string) {
  const reply = document.createElement('model-response');
  reply.innerHTML = '<message-content><code-block><pre><code></code></pre></code-block></message-content>';
  reply.querySelector('code')!.textContent = text;
  document.querySelector('main')!.append(reply);
}

const titles = () => useStore.getState().sessions.map((s) => s.capsule.steps.map((st) => st.title));

let controller: StemController;
beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ sessions: [], activeSessionId: undefined, activeStepIndex: 0, status: 'idle', errorMessage: undefined });
  controller = new StemController(geminiAdapter);
});
afterEach(() => {
  controller.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

async function showCutOff() {
  page(CUT);
  controller.startWatching();
  await vi.advanceTimersByTimeAsync(5_000);
  // Still a paused stream: nothing shown, no error yet.
  expect(useStore.getState().sessions).toHaveLength(0);
  expect(useStore.getState().status).not.toBe('error');
  await vi.advanceTimersByTimeAsync(8_000);
}

describe('cut-off answer (D38)', () => {
  it('shows the steps that closed, marked incomplete, once the chat has stopped', async () => {
    await showCutOff();
    const state = useStore.getState();
    expect(titles()).toEqual([['Combine the parallel pair', 'Find the battery current']]);
    expect(state.sessions[0]!.cutOff).toBe(true);
    expect(state.activeSessionId).toBe(state.sessions[0]!.id);
    expect(state.status).toBe('ready');
    expect(state.errorMessage).toMatch(/stopped before the end/i);
    expect(state.errorMessage).toMatch(/continue/i);
    expect(state.errorMessage).toMatch(/\+/);
    expect(state.errorMessage).not.toMatch(/parser|code|capsule/i);
  });

  it('keeps the cut-off answer as it is while nothing new arrives', async () => {
    await showCutOff();
    const id = useStore.getState().sessions[0]!.id;
    useStore.setState({ activeStepIndex: 1 });
    document.querySelector('main')!.append(document.createElement('span'));
    await vi.advanceTimersByTimeAsync(13_000);
    expect(useStore.getState().sessions.map((s) => s.id)).toEqual([id]);
    expect(useStore.getState().activeStepIndex).toBe(1);
  });

  it('replaces the cut-off answer in place when the same reply finishes', async () => {
    await showCutOff();
    const id = useStore.getState().sessions[0]!.id;
    document.querySelector('code')!.textContent = FULL;
    await vi.advanceTimersByTimeAsync(1_000);
    const state = useStore.getState();
    expect(state.sessions.map((s) => s.id)).toEqual([id]);
    expect(titles()).toEqual([['Combine the parallel pair', 'Find the battery current', 'Verify by the current split']]);
    expect(state.sessions[0]!.cutOff).toBeUndefined();
    expect(state.errorMessage).toBeUndefined();
  });

  it('stitches a continuation that brings only the missing steps onto the cut-off answer', async () => {
    await showCutOff();
    const id = useStore.getState().sessions[0]!.id;
    addReply([...META, ...S3, ...CLOSING].join('\n'));
    await vi.advanceTimersByTimeAsync(1_000);
    const state = useStore.getState();
    expect(state.sessions.map((s) => s.id)).toEqual([id]);
    expect(titles()).toEqual([['Combine the parallel pair', 'Find the battery current', 'Verify by the current split']]);
    expect(state.sessions[0]!.cutOff).toBeUndefined();
    expect(state.errorMessage).toBeUndefined();
  });

  it('leaves the cut-off answer alone when an unrelated question is answered', async () => {
    await showCutOff();
    const other = FULL.replace('qid: q1', 'qid: q2').replace('mode: full', 'mode: new')
      .replace(/^question: .*$/m, 'question: Find the time constant of the RC circuit.');
    addReply(other);
    await vi.advanceTimersByTimeAsync(1_000);
    const state = useStore.getState();
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0]!.cutOff).toBe(true);
    expect(titles()[0]).toEqual(['Combine the parallel pair', 'Find the battery current']);
    expect(state.sessions[1]!.cutOff).toBeUndefined();
  });

  it('still reports an answer that stopped before any step closed', async () => {
    page([...META, '@step id=s1', 'title: Combine the parallel pair', '@body', 'With'].join('\n'));
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(13_000);
    const state = useStore.getState();
    expect(state.sessions).toHaveLength(0);
    expect(state.status).toBe('error');
    expect(state.errorMessage).toMatch(/stopped before the end/i);
    expect(state.errorMessage).toMatch(/Parser code: missing_end\.$/);
  });
});
