/**
 * While the chat is still writing an answer, the steps it has finished are shown, marked as still
 * being written, and the finished answer takes their place. A step that is still open is never
 * shown, so neither is a figure inside it. A reply that streams without a pause must not hold the
 * panel back until it ends.
 *
 * The page is real DOM in Gemini's markup, read through the real Gemini adapter.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiAdapter } from '@/src/platforms/gemini';
import { useStore } from '@/src/state/store';
import { StemController } from './controller';

const META = ['@meta', 'version: 2', 'subject: Physics', 'topic: Block on an incline', '@endmeta'];
const S1 = ['@step id=s1', 'title: Draw the forces', '@body', 'Weight, normal force and friction act on the block.', '@endbody', '@endstep'];
const S2_OPEN = [
  '@step id=s2', 'title: Balance the perpendicular forces', '@body', 'The block stays on the surface.', '@endbody',
  '@diagram id=f1 type=scene', 'kind: fbd', 'body: block', 'force: W 49 N weight on block', '@enddiagram',
];
const S2 = [...S2_OPEN, '@endstep'];
const S3 = ['@step id=s3', 'title: Apply the second law', '@body', 'Along the incline the net force gives the acceleration.', '@endbody', '@endstep'];
const CLOSING = ['@solution', 'The block accelerates at $3.2\\,\\text{m/s}^2$.', '@endsolution', '@end'];
const FULL = [...META, ...S1, ...S2, ...S3, ...CLOSING].join('\n');

const code = () => document.querySelector<HTMLElement>('model-response:last-of-type code')!;
const state = () => useStore.getState();
const titles = () => state().sessions.map((s) => s.capsule.steps.map((step) => step.title));

/** The chat's Stop control, in its composer: shown while it writes. */
function streaming(on: boolean): void {
  document.querySelector('input-area-v2 button[aria-label="Stop response"]')?.remove();
  if (!on) return;
  const stop = document.createElement('button');
  stop.setAttribute('aria-label', 'Stop response');
  document.querySelector('input-area-v2')!.append(stop);
}

function newReply(text = ''): void {
  const reply = document.createElement('model-response');
  reply.innerHTML = '<message-content><code-block><pre><code></code></pre></code-block></message-content>';
  reply.querySelector('code')!.textContent = text;
  document.querySelector('main')!.append(reply);
}

/**
 * The reply grows to `text` 40 characters every 100 ms: it never pauses for as long as one look at
 * the page takes. `settle`: then wait for the look that follows the last change.
 */
async function streamTo(text: string, settle = true): Promise<void> {
  const el = code();
  for (let sent = (el.textContent ?? '').length; sent < text.length;) {
    sent = Math.min(text.length, sent + 40);
    el.textContent = text.slice(0, sent);
    await vi.advanceTimersByTimeAsync(100);
  }
  if (settle) await vi.advanceTimersByTimeAsync(400);
}

let controller: StemController;
beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML =
    '<main></main><input-area-v2><rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea></input-area-v2>';
  useStore.setState({
    sessions: [], activeSessionId: undefined, activeStepIndex: 0, status: 'idle', errorMessage: undefined,
    writingId: undefined, buttonInjected: false,
  });
  controller = new StemController(geminiAdapter);
});
afterEach(() => {
  controller.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('steps while the chat is still writing', () => {
  it('shows a finished step during a reply that never pauses, long before it ends', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    // Step 1 closes early; the reply is still growing, without a pause, when this returns.
    await streamTo([...META, ...S1, ...S2_OPEN].join('\n'), false);

    expect(titles()).toEqual([['Draw the forces']]);
    const [session] = state().sessions;
    expect(state().writingId).toBe(session!.id);
    expect(state().activeSessionId).toBe(session!.id);
    expect(state().status).toBe('ready');
    expect(state().errorMessage).toBeUndefined();
    // Not the whole answer yet: it cannot be saved.
    expect(session!.cutOff).toBe(true);
  });

  it('never shows a step that is still open, nor the figure inside it', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    // Step 2 has its body and its whole figure, but not its closing line.
    await streamTo([...META, ...S1, ...S2_OPEN].join('\n'));
    expect(titles()).toEqual([['Draw the forces']]);
    expect(state().sessions[0]!.capsule.steps.some((step) => step.diagram)).toBe(false);

    await streamTo([...META, ...S1, ...S2, '@step id=s3', 'title: Apply'].join('\n'));
    expect(titles()).toEqual([['Draw the forces', 'Balance the perpendicular forces']]);
    expect(state().sessions[0]!.capsule.steps[1]!.diagram?.content).toContain('force: W 49 N weight on block');
  });

  it('puts the finished answer in the same place, keeping the step being read', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    await streamTo([...META, ...S1, ...S2].join('\n'));
    const id = state().sessions[0]!.id;
    useStore.getState().setActiveStep(1);

    await streamTo(FULL);
    streaming(false);
    await vi.advanceTimersByTimeAsync(500);

    expect(state().sessions.map((s) => s.id)).toEqual([id]);
    expect(titles()).toEqual([['Draw the forces', 'Balance the perpendicular forces', 'Apply the second law']]);
    expect(state().sessions[0]!.cutOff).toBeUndefined();
    expect(state().writingId).toBeUndefined();
    expect(state().activeStepIndex).toBe(1);
    expect(state().sessions[0]!.capsule.solution).toContain('accelerates');
  });

  it('does not take "@end", the start of "@endbody", for the end of the answer while it is written', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    // The page is looked at while the reply ends in the first four characters of "@endbody".
    code().textContent = [...META, ...S1, '@step id=s2', 'title: Balance', '@body', 'The block stays', '@end'].join('\n');
    await vi.advanceTimersByTimeAsync(400);
    expect(state().writingId).toBe(state().sessions[0]!.id);

    await streamTo(FULL);
    streaming(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(titles()).toEqual([['Draw the forces', 'Balance the perpendicular forces', 'Apply the second law']]);
    expect(state().sessions[0]!.cutOff).toBeUndefined();
  });

  it('follows a reply by its changing text where the chat shows no sign that it is writing', async () => {
    newReply();
    controller.startWatching();
    await streamTo([...META, ...S1, '@step id=s2', 'title: Balance'].join('\n'));
    expect(titles()).toEqual([['Draw the forces']]);
    expect(state().writingId).toBe(state().sessions[0]!.id);
  });

  it('says the chat stopped when the writing stalls, and takes that back if it goes on', async () => {
    newReply();
    controller.startWatching();
    await streamTo([...META, ...S1, '@step id=s2', 'title: Balance'].join('\n'));
    const id = state().sessions[0]!.id;

    await vi.advanceTimersByTimeAsync(13_000);
    expect(state().writingId).toBeUndefined();
    expect(state().errorMessage).toMatch(/stopped before the end/i);

    await streamTo([...META, ...S1, ...S2, '@step id=s3'].join('\n'));
    expect(state().writingId).toBe(id);
    expect(state().errorMessage).toBeUndefined();
    expect(titles()).toEqual([['Draw the forces', 'Balance the perpendicular forces']]);
  });

  it('does not call an old unfinished answer "being written" while the chat writes something else', async () => {
    newReply([...META, ...S1, '@step id=s2', 'title: Balance'].join('\n'));
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(1_000);
    // A new reply in the chat's own words, streaming below the old one.
    const reply = document.createElement('model-response');
    reply.innerHTML = '<message-content><p>Sure.</p></message-content>';
    document.querySelector('main')!.append(reply);
    streaming(true);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(state().sessions).toHaveLength(0);
    expect(state().writingId).toBeUndefined();
  });

  it('leaves an answer that is waiting for its continuation alone while the continuation is written', async () => {
    // The first reply stopped inside step 2 and is shown as incomplete.
    newReply([...META, ...S1, '@step id=s2', 'title: Balance'].join('\n'));
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(13_000);
    const id = state().sessions[0]!.id;
    expect(state().errorMessage).toMatch(/stopped before the end/i);

    // "Continue": a second reply brings only the missing steps, streamed.
    newReply();
    streaming(true);
    await streamTo([...META, ...S2, ...S3].join('\n'));
    expect(state().sessions.map((s) => s.id)).toEqual([id]);
    expect(titles()).toEqual([['Draw the forces']]);

    await streamTo([...META, ...S2, ...S3, ...CLOSING].join('\n'));
    streaming(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(state().sessions.map((s) => s.id)).toEqual([id]);
    expect(titles()).toEqual([['Draw the forces', 'Balance the perpendicular forces', 'Apply the second law']]);
    expect(state().sessions[0]!.cutOff).toBeUndefined();
  });

  it('refuses an Ask-in-chat follow-up until the answer has been written', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    await streamTo([...META, ...S1, '@step id=s2'].join('\n'));
    expect(await controller.followUp('Why does friction point up the incline?', 'Draw the forces', 'Physics')).toBe(false);
    expect(state().errorMessage).toMatch(/wait for the current answer/i);
  });
});
