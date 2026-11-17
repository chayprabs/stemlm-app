/**
 * "Paste an answer": the manual way in when the chat page cannot be read, or the answer comes
 * from a chat stemLM does not run on. The text is studied like any captured answer, and nothing
 * on the page is read or written.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: false, method: 'none' as const })),
}));

import { StemController } from './controller';
import { claudeAdapter } from '@/src/platforms/claude';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { useStore } from '@/src/state/store';

const PLAIN = [
  'Here is how to find the range, one stage at a time.',
  '### Step 1: Write what is given',
  'List every quantity in the problem with its unit, and name the unknown the question asks for.',
  '### Step 2: Choose the relation',
  'The range of a projectile launched at angle $\\theta$ is $R = u^2 \\sin 2\\theta / g$.',
  '### Step 3: Substitute and compute',
  'With $u = 20$ m/s and $\\theta = 30^\\circ$, $R = 400 \\times 0.866 / 9.81 = 35.3$ m.',
].join('\n\n');

let c: StemController;
const state = () => useStore.getState();

beforeEach(() => {
  document.body.innerHTML = '<main><div id="thread"><p>The page as the host left it.</p></div></main>';
  useStore.setState({ panelOpen: true, status: 'idle', errorMessage: undefined, view: 'steps', buttonInjected: false, sessions: [], activeSessionId: undefined, activeStepIndex: 0 });
  c = new StemController(claudeAdapter);
});

afterEach(() => {
  c.stopWatching();
  document.body.innerHTML = '';
});

describe('loadFromText', () => {
  it('reads a pasted stemLM answer as one, code fence and all', () => {
    const page = document.body.innerHTML;
    expect(c.loadFromText(`Sure, here it is:\n\n${FENCED_ELECTRICAL}\n\nLet me know if anything is unclear.`)).toBe(true);
    const [session] = state().sessions;
    expect(state().sessions).toHaveLength(1);
    expect(session!.origin).toBeUndefined();
    expect(session!.capsule.steps.length).toBeGreaterThan(0);
    expect(session!.platform).toBe('claude');
    expect(session!.question).toBe(session!.capsule.meta.question?.trim() || session!.capsule.meta.topic);
    expect(state()).toMatchObject({ status: 'ready', errorMessage: undefined, activeSessionId: session!.id, activeStepIndex: 0 });
    expect(document.body.innerHTML).toBe(page);
  });

  it('arranges pasted plain prose into steps, marked as structured by stemlm', () => {
    expect(c.loadFromText(PLAIN)).toBe(true);
    const [session] = state().sessions;
    expect(session!.origin).toBe('ingest');
    expect(session!.capsule.steps.map((s) => s.title)).toEqual(['Write what is given', 'Choose the relation', 'Substitute and compute']);
    expect(session!.raw).toBe(PLAIN);
    expect(state().status).toBe('ready');
  });

  it('adds to the questions already open instead of replacing them', () => {
    expect(c.loadFromText(FENCED_ELECTRICAL)).toBe(true);
    const first = state().sessions[0]!.id;
    expect(c.loadFromText(PLAIN)).toBe(true);
    expect(state().sessions.map((s) => s.origin)).toEqual([undefined, 'ingest']);
    expect(state().sessions[0]!.id).toBe(first);
    expect(state().activeSessionId).toBe(state().sessions[1]!.id);
  });

  it.each([
    ['nothing', '   \n '],
    ['a short reply', 'You are welcome.'],
    ['a refusal', "I'm sorry, but I can't help with that request."],
    ['a stemLM answer cut off before any step closed', '@meta\nsubject: Physics\ntopic: Incline\n@endmeta\n@step id=s1\ntitle: Draw'],
  ])('refuses %s and changes nothing', (_what, text) => {
    expect(c.loadFromText(text)).toBe(false);
    expect(state()).toMatchObject({ sessions: [], status: 'idle', errorMessage: undefined });
  });
});
