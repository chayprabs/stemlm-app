import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StemController } from './controller';
import { attachTextFile } from '@/src/lib/file-inject';
import { PROTOCOL_FILENAME, STEMLM_SENTINEL } from '@/src/protocol/builder';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: false, method: 'none' as const })),
}));
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { TEN_STEP_ELECTRICAL } from '@/src/protocol/__fixtures-long-steps';
import { SOLUTION_ANCHOR_ID } from '@/src/lib/step-entries';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');
const TEN_STEP_BODY = TEN_STEP_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');
const WEAK_DIAGRAM_BODY = [
  '@meta',
  'version: 1',
  'subject: Electrical',
  'topic: Simple circuit',
  'question: Consider the circuit with a 12 V source and two series resistors.',
  '@endmeta',
  '@step',
  'title: Find total resistance',
  '@formula',
  '$$R_T=R_1+R_2$$',
  '@endformula',
  '@body',
  '$R_T$ is total series resistance. With $R_1=2\\,\\Omega$ and $R_2=4\\,\\Omega$: $R_T=2+4=6\\,\\Omega$.',
  '@endbody',
  '@endstep',
  '@step',
  'title: Compute source current',
  '@formula',
  '$$I=\\frac{V}{R_T}$$',
  '@endformula',
  '@body',
  '$I$ is source current. With $V=12\\,\\text{V}$ and $R_T=6\\,\\Omega$: $I=12/6=2\\,\\text{A}$.',
  '@endbody',
  '@endstep',
  '@step',
  'title: Compute resistor voltage',
  '@formula',
  '$$V_1=IR_1$$',
  '@endformula',
  '@body',
  '$V_1$ is the voltage across $R_1$. With $I=2\\,\\text{A}$ and $R_1=2\\,\\Omega$: $V_1=2\\times2=4\\,\\text{V}$.',
  '@endbody',
  '@endstep',
  '@solution',
  'The total current is $2\\,\\text{A}$ and $V_1=4\\,\\text{V}$.',
  '@endsolution',
  '@end',
].join('\n');
const MALFORMED_NO_STEPS_BODY = [
  '@meta',
  'version: 1',
  'subject: Electrical',
  'topic: Broken capsule',
  '@endmeta',
  '@solution',
  'This response has no steps.',
  '@endsolution',
  '@end',
].join('\n');

class MockAdapter implements PlatformAdapter {
  id = 'gemini' as const;
  label = 'Gemini';
  brand = { accent: '#4285f4' };
  layoutRoots = ['main'];
  editorText = '';
  inserted = '';
  insertOk = true;
  capsules: string[] = [];
  streaming = false;

  matches() {
    return true;
  }
  findEditor(): HTMLElement | null {
    return document.body;
  }
  getEditorText() {
    return this.editorText;
  }
  insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
    this.inserted = text;
    if (mode === 'append' && this.editorText.trim()) {
      this.editorText = `${this.editorText.trimEnd()}\n\n${text}`;
    } else {
      this.editorText = text;
    }
    return this.insertOk;
  }
  getComposerBox() {
    return document.body;
  }
  getComposerActionRow() {
    return document.body;
  }
  getComposerLayout() {
    return { box: document.body, actionRow: document.body };
  }
  getComposerShell() {
    return document.body;
  }
  getComposerAnchor() {
    return document.body;
  }
  getComposerLeadingAnchor() {
    return null;
  }
  getAssistantBlocks() {
    return [];
  }
  getLatestAssistantText() {
    return this.capsules[this.capsules.length - 1] ?? '';
  }
  extractCapsules() {
    return this.capsules;
  }
  isStreaming() {
    return this.streaming;
  }
  composerHasAttachments() {
    return false;
  }
  focusComposerQuestionSlot() {
    /* noop */
  }
}

function resetStore() {
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    view: 'steps',
    buttonInjected: false,
    sessions: [],
    activeSessionId: undefined,
    activeStepIndex: 0,
  });
}

describe('StemController.inject', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
  });

  it('uses file attach on an empty composer when upload succeeds', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = '';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(attachTextFile).toHaveBeenCalled();
    expect(adapter.editorText).toContain(PROTOCOL_FILENAME);
    expect(adapter.editorText).not.toContain('OUTPUT:');
    c.stopWatching();
  });

  it('attaches the protocol file beside an existing question instead of pasting it', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(attachTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/ELECTRICAL[\s\S]*PHYSICS|PHYSICS[\s\S]*ELECTRICAL/),
      expect.objectContaining({ filename: PROTOCOL_FILENAME, preserveExisting: false }),
    );
    expect(adapter.editorText).toContain('Solve this circuit');
    expect(adapter.editorText).toContain(PROTOCOL_FILENAME);
    expect(adapter.editorText).toContain(STEMLM_SENTINEL);
    expect(adapter.editorText).toContain('Follow the attached');
    expect(adapter.editorText).toContain('Infer the subject from the problem');
    expect(adapter.editorText.indexOf('Solve this circuit')).toBeLessThan(
      adapter.editorText.indexOf(STEMLM_SENTINEL),
    );
    expect(adapter.inserted).not.toContain('Solve this circuit');
    expect(adapter.editorText).not.toContain('(Electrical)');
    expect(adapter.editorText).not.toContain('OUTPUT:');
    expect(adapter.editorText).not.toContain('--- stemLM instructions');
    expect(adapter.inserted).toContain(PROTOCOL_FILENAME);
    expect(adapter.inserted).not.toContain('Solve this circuit');
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.stopWatching();
  });

  it('preserves an existing image/PDF and only adds the protocol file', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = '';
    adapter.composerHasAttachments = () => true;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(attachTextFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ filename: PROTOCOL_FILENAME, preserveExisting: true }),
    );
    expect(adapter.editorText).toContain(PROTOCOL_FILENAME);
    expect(adapter.editorText).toContain('image/PDF');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    c.stopWatching();
  });

  it('appends a short stub when the composer already has a question', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'What is the horizontal range of this projectile?';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.editorText).toMatch(/^What is the horizontal range/);
    expect(adapter.editorText).toContain(PROTOCOL_FILENAME);
    expect(adapter.editorText.indexOf('What is the horizontal range')).toBeLessThan(
      adapter.editorText.indexOf(PROTOCOL_FILENAME),
    );
    c.stopWatching();
  });

  it('attaches a universal protocol file so every subject is available', async () => {
    const question = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const adapter = new MockAdapter();
    adapter.editorText = question;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(attachTextFile).toHaveBeenCalledWith(
      expect.stringContaining('ELECTRICAL'),
      expect.any(Object),
    );
    const file = vi.mocked(attachTextFile).mock.calls.at(-1)?.[0] as string;
    expect(file).toContain('PHYSICS');
    expect(file).toContain('CHEMISTRY');
    expect(file).toContain('MATH');
    expect(file).toContain('BIOLOGY');
    expect(file).toContain('MECHANICAL');
    expect(file).toContain('CIVIL');
    expect(file).toContain('CHEMICAL');
    expect(file).not.toContain('PHYSICS: subject=');
    expect(adapter.inserted).not.toContain('(Electrical)');
    expect(adapter.inserted).toContain('Infer the subject from the problem');
    c.stopWatching();
  });

  it('falls back to a compact inline paste when the host cannot attach a file', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.editorText).toContain('Solve this circuit');
    expect(adapter.editorText).toContain('OUTPUT:');
    expect(adapter.editorText).toContain('@meta');
    expect(adapter.editorText).toContain('Electrical');
    expect(adapter.editorText).toContain('stemLM instructions');
    expect(adapter.editorText).not.toContain('DIAGRAM REGISTRY');
    expect(adapter.editorText).not.toContain('anatomy\tleftover');
    expect(adapter.inserted).not.toContain(PROTOCOL_FILENAME);
    c.stopWatching();
  });

  it('does not inject twice while the protocol is still in the composer', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'something';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(await c.inject()).toBe(false);
    c.stopWatching();
  });

  it('allows a second injection after capture resets the button', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Find the range of a projectile at 45 degrees';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(useStore.getState().buttonInjected).toBe(true);

    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().buttonInjected).toBe(false);

    adapter.editorText = 'Another projectile question';
    expect(await c.inject()).toBe(true);
    c.stopWatching();
  });

  it('surfaces error when composer insert fails', async () => {
    const adapter = new MockAdapter();
    adapter.insertOk = false;
    adapter.editorText = 'question';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(false);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('does not paste the protocol wall when the file attached but the stub insert fails', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const inserted: string[] = [];
    adapter.insertPrompt = (text: string, mode: 'replace' | 'append' = 'replace') => {
      inserted.push(text);
      adapter.inserted = text;
      return false;
    };
    const c = new StemController(adapter);

    expect(await c.inject()).toBe(false);
    expect(inserted.length).toBeGreaterThan(0);
    for (const text of inserted) {
      expect(text).toContain(PROTOCOL_FILENAME);
      expect(text).not.toContain('--- stemLM instructions');
      expect(text).not.toContain('OUTPUT:');
    }
    expect(adapter.editorText).toBe('Solve this circuit with a 12V source and resistor (Kirchhoff)');
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('injects a short pointer when the protocol is already in the composer', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'First question about a projectile';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    c.resetInjection();
    adapter.editorText = `Another projectile question\n${adapter.editorText}`;
    expect(await c.inject()).toBe(true);
    expect(adapter.inserted).toContain('New problem');
    expect(adapter.inserted).toContain(STEMLM_SENTINEL);
    expect(adapter.inserted).not.toContain('OUTPUT:');
    expect(adapter.inserted).not.toContain('@meta');
    expect(adapter.editorText).toContain('Another projectile question');
    c.stopWatching();
  });

  it('injects a short pointer when the protocol is already in the thread, not only the composer', async () => {
    document.body.innerHTML = `
      <div data-message-author-role="user">
        Find the range of a projectile
        --- stemLM ---
        Follow the attached stemlm-protocol.txt
      </div>
      <div id="ed" contenteditable="true"></div>
    `;
    const adapter = new MockAdapter();
    adapter.findEditor = () => document.getElementById('ed');
    adapter.editorText = 'A new kinematics question on the same chat';
    const c = new StemController(adapter);

    expect(await c.inject()).toBe(true);
    expect(adapter.inserted).toContain('New problem');
    expect(adapter.inserted).toContain(STEMLM_SENTINEL);
    expect(adapter.inserted).not.toContain('textbook-style solution');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    expect(adapter.inserted).not.toContain('@meta');
    expect(adapter.editorText).toContain('A new kinematics question');
    expect(adapter.editorText.indexOf('A new kinematics question')).toBeLessThan(
      adapter.editorText.indexOf(STEMLM_SENTINEL),
    );
    c.stopWatching();
  });

  it('re-injects a pointer when protocol is present and the question changed', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Find the range of a projectile';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(useStore.getState().buttonInjected).toBe(true);
    adapter.editorText = `A different kinematics question\n${adapter.editorText}`;
    expect(await c.inject()).toBe(true);
    expect(adapter.inserted).toContain('New problem');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    c.stopWatching();
  });

  it('uses a pointer, not leftover dump, when a photo is attached and file attach fails', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.editorText = '';
    adapter.composerHasAttachments = () => true;
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(adapter.inserted).toContain(PROTOCOL_FILENAME);
    expect(adapter.inserted).toContain(STEMLM_SENTINEL);
    expect(adapter.inserted).not.toContain('DIAGRAM REGISTRY');
    expect(adapter.inserted).not.toContain('anatomy\tleftover');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    c.stopWatching();
  });
});

describe('StemController.followUp', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
  });

  it('sets buttonInjected after a successful follow-up', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    expect(await c.followUp('Why is R1 + R2 here?', 'Series resistors', 'Electrical')).toBe(true);
    expect(useStore.getState().buttonInjected).toBe(true);
    c.stopWatching();
  });

  it('inserts a question slot above follow-up context and protocol', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    let focused = false;
    adapter.focusComposerQuestionSlot = () => {
      focused = true;
    };

    const ok = await c.followUp(
      'Why is total resistance R1 + R2 here?',
      'Combine series resistors',
      'Electrical',
    );
    expect(ok).toBe(true);
    expect(adapter.editorText).toMatch(/^Ask your question here:/);
    expect(adapter.editorText).toContain('> Why is total resistance R1 + R2 here?');
    expect(adapter.editorText).toContain('stemLM follow-up context');
    expect(focused).toBe(true);
    c.stopWatching();
  });

  it('rejects follow-up while the initial answer is still loading', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(useStore.getState().status).toBe('loading');

    const ok = await c.followUp('Why is R1 + R2 here?', 'Series resistors', 'Electrical');
    expect(ok).toBe(false);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toContain('Wait for the current answer');
    c.stopWatching();
  });

  it('succeeds with file attach when the protocol chip is visible but the filename line is missing from editor text', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
    const adapter = new MockAdapter();
    adapter.composerHasAttachments = () => true;
    adapter.insertPrompt = (text: string, mode: 'replace' | 'append' = 'replace') => {
      adapter.inserted = text;
      adapter.editorText =
        'Ask your question here:\n\n\n--- stemLM follow-up context (do not remove) ---\n> Why is total resistance R1 + R2 here?';
      return true;
    };
    const c = new StemController(adapter);

    const ok = await c.followUp(
      'Why is total resistance R1 + R2 here?',
      'Combine series resistors',
      'Electrical',
    );
    expect(ok).toBe(true);
    expect(adapter.editorText).toContain('stemLM follow-up context');
    const file = vi.mocked(attachTextFile).mock.calls.at(-1)?.[0] as string;
    expect(file).toContain('SUBJECT REGISTRY');
    expect(file).toContain('PHYSICS');
    expect(file).toContain('ELECTRICAL');
    expect(file).toContain('CHEMICAL');
    expect(file).not.toContain('PHYSICS: subject=');
    expect(adapter.inserted).toContain('Follow the attached');
    expect(adapter.inserted).toContain('FOLLOW-UP CONTRACT');
    expect(adapter.inserted).not.toContain('--- stemLM instructions');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    expect(adapter.inserted).not.toContain('ARCHETYPE REGISTRY');
    c.stopWatching();
  });

  it('applies a same-question follow-up to the current session instead of opening a new blob', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    const originalId = useStore.getState().sessions[0]!.id;
    c.stopWatching();

    await c.followUp('Why is R1 + R2 here?', 'Series resistors', 'Electrical');
    const followUpCapsule = CAPSULE_BODY.replace('Circuit format check', 'Follow-up explanation');
    adapter.capsules = [followUpCapsule];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.topic).toBe('Follow-up explanation');
    c.stopWatching();
  });

  it('applies an id patch from ask-in-chat onto the current question', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const withIds = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Electrical',
      'topic: Series resistors',
      'qid: q1',
      '@endmeta',
      '@step id=s1',
      'title: Add the resistors',
      '@body',
      '$R_T$ is 6 ohm.',
      '@endbody',
      '@endstep',
      '@step id=s2',
      'title: Compute current',
      '@body',
      '$I$ is 2 mA.',
      '@endbody',
      '@endstep',
      '@solution',
      'I = 2 mA',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    adapter.capsules = [withIds];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions[0]!.capsule.steps[1]!.body).toContain('2 mA');
    c.stopWatching();

    await c.followUp('step 2 is wrong, current is 2 A', 'Compute current', 'Electrical');
    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Series resistors',
        'qid: q1',
        'mode: patch',
        '@endmeta',
        '@patch op=replace id=s2',
        '@step id=s2',
        'title: Compute current with correct units',
        '@body',
        '$I$ is 2 A because $12/6=2\\,\\text{A}$.',
        '@endbody',
        '@endstep',
        '@endpatch',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.capsule.steps).toHaveLength(2);
    expect(sessions[0]!.capsule.steps[1]!.id).toBe('s2');
    expect(sessions[0]!.capsule.steps[1]!.title).toContain('correct units');
    expect(sessions[0]!.capsule.steps[0]!.id).toBe('s1');
    c.stopWatching();
  });

  it('hangs an anchored solution ask off the same session instead of opening a new one', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [FENCED_ELECTRICAL];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const original = useStore.getState().sessions[0]!;
    expect(original).toBeTruthy();
    const originalSteps = original.capsule.steps.length;
    c.stopWatching();

    await c.followUp('What if V doubles?', 'the whole solution', 'Electrical', {
      intent: 'ask-solution',
      anchor: { sessionId: original.id, anchorStepId: SOLUTION_ANCHOR_ID },
    });
    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Scale the source',
        'qid: q1',
        'mode: resolve',
        '@endmeta',
        '@step id=s1',
        'title: Scale linearly',
        '@body',
        'Current doubles with the source.',
        '@endbody',
        '@endstep',
        '@solution',
        'I doubles.',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.id).toBe(original.id);
    expect(state.sessions[0]!.capsule.steps).toHaveLength(originalSteps);
    expect(state.sessions[0]!.followups).toHaveLength(1);
    expect(state.sessions[0]!.followups![0]!.anchorStepId).toBe(SOLUTION_ANCHOR_ID);
    expect(state.sessions[0]!.followups![0]!.capsule.steps[0]!.title).toContain('Scale');
    expect(state.view).toBe('solution');
    c.stopWatching();
  });

  it('waits for a NEW answer: never attaches a capsule already on the page when Ask in chat is clicked', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    // A previous answer (e.g. an old "missing problem statement" capsule) is
    // already visible in the chat history.
    adapter.capsules = [FENCED_ELECTRICAL];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const original = useStore.getState().sessions[0]!;
    c.stopWatching();

    await c.followUp('Problem: circuit\nStep 1 of 2: Add resistors', 'Add resistors', 'Electrical', {
      intent: 'ask',
      anchor: { sessionId: original.id, anchorStepId: original.capsule.steps[0]!.id },
    });
    // Not loading, no banner: the student still has to type + send their question.
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBeUndefined();

    // Watcher runs over the unchanged page — the stale capsule must NOT attach.
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions[0]!.followups ?? []).toHaveLength(0);

    // The student sends; the assistant produces a genuinely new answer.
    c.stopWatching();
    adapter.capsules = [
      FENCED_ELECTRICAL,
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Why series adds',
        'qid: q1',
        'mode: resolve',
        '@endmeta',
        '@step id=s1',
        'title: Series carries one current',
        '@body',
        'The same current flows through both, so drops add.',
        '@endbody',
        '@endstep',
        '@solution',
        'Resistances add in series.',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.followups).toHaveLength(1);
    expect(state.sessions[0]!.followups![0]!.capsule.meta.topic).toBe('Why series adds');
    c.stopWatching();
  });

  it('no-ops an empty follow-up without inserting', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    expect(await c.followUp('   ', 'Series resistors', 'Electrical')).toBe(true);
    expect(adapter.inserted).toBe('');
    expect(adapter.editorText).toBe('');
    c.stopWatching();
  });

  it('keeps qid when a follow-up re-emits disjoint step ids', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const original = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Electrical',
      'topic: Series resistors',
      'qid: q1',
      '@endmeta',
      '@step id=s1',
      'title: Add the resistors',
      '@body',
      '$R_T$ is 6 ohm.',
      '@endbody',
      '@endstep',
      '@step id=s2',
      'title: Compute current',
      '@body',
      '$I$ is 2 A.',
      '@endbody',
      '@endstep',
      '@solution',
      'I = 2 A',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const originalId = useStore.getState().sessions[0]!.id;
    c.stopWatching();

    await c.followUp('solve it another way', 'Compute current', 'Electrical');
    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Series resistors',
        'mode: resolve',
        '@endmeta',
        '@step id=a1',
        'title: Use conductance',
        '@body',
        '$G=1/R$.',
        '@endbody',
        '@endstep',
        '@step id=a2',
        'title: Sum conductances',
        '@body',
        'Then $I=VG$.',
        '@endbody',
        '@endstep',
        '@solution',
        'same I',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.qid).toBe('q1');
    expect(sessions[0]!.capsule.steps[0]!.id).toBe('a1');
    c.stopWatching();
  });

  it('opens a new session on mode: new or a topic/qid mismatch', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();

    await c.followUp('now solve this biology Punnett square', 'Off topic', 'Biology');
    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Biology',
        'topic: Punnett square',
        'qid: q2',
        'mode: new',
        'archetype: conceptual',
        '@endmeta',
        '@step id=s1',
        'title: Draw the square',
        '@body',
        'Alleles go on the axes.',
        '@endbody',
        '@endstep',
        '@step id=s2',
        'title: Fill cells',
        '@body',
        'Each cell is one offspring genotype.',
        '@endbody',
        '@endstep',
        '@step id=s3',
        'title: Read ratios',
        '@body',
        'Count phenotypes.',
        '@endbody',
        '@endstep',
        '@solution',
        '3:1',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(2);
    c.stopWatching();
  });
});

describe('StemController.loadConversation', () => {
  beforeEach(resetStore);

  it('loads sessions from visible chat capsules', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);

    const count = await c.loadConversation({ maxWaitMs: 0 });
    expect(count).toBe(1);
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('hasConversationToLoad is true when capsules exist and the panel is empty', () => {
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);
    expect(c.hasConversationToLoad()).toBe(true);
    c.stopWatching();
  });

  it('hasConversationToLoad is false when nothing is on the page', () => {
    document.body.replaceChildren();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    expect(c.hasConversationToLoad()).toBe(false);
    c.stopWatching();
  });

  it('polls until capsules appear in the chat', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    setTimeout(() => {
      adapter.capsules = [CAPSULE_BODY];
    }, 400);

    const count = await c.loadConversation({ maxWaitMs: 1200 });
    expect(count).toBe(1);
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();
  });

  it('surfaces an error when no stemLM answers are on the page', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    const count = await c.loadConversation({ maxWaitMs: 0 });
    expect(count).toBe(0);
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('stitches two resume parts with the same token into one session', async () => {
    const adapter = new MockAdapter();
    const part1 = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Physics',
      'topic: Range',
      'question: Find the range.',
      'qid: q1',
      '@endmeta',
      '@step id=s1',
      'title: Write the range formula',
      '@body',
      '$R$ is range.',
      '@endbody',
      '@endstep',
      '@resume token=aa11bb22',
    ].join('\n');
    const part2 = [
      '```stemlm',
      '@resume token=aa11bb22',
      '@step id=s2',
      'title: Substitute the angle',
      '@body',
      'With $\\theta=45$: $R=40.8\\,\\text{m}$.',
      '@endbody',
      '@endstep',
      '@solution',
      'Range is $40.8\\,\\text{m}$.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    adapter.capsules = [part1, part2];
    const c = new StemController(adapter);
    const count = await c.loadConversation({ maxWaitMs: 0 });
    expect(count).toBe(1);
    const session = useStore.getState().sessions[0];
    expect(session?.capsule.steps.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(session?.capsule.meta.qid).toBe('q1');
    c.stopWatching();
  });
});

describe('StemController native Gemini follow-up (no Ask-in-chat)', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
  });

  const original = [
    '```stemlm',
    '@meta',
    'version: 2',
    'subject: Electrical',
    'topic: Series resistors',
    'qid: q1',
    '@endmeta',
    '@step id=s1',
    'title: Add the resistors',
    '@body',
    '$R_T$ is 6 ohm.',
    '@endbody',
    '@endstep',
    '@step id=s2',
    'title: Compute current',
    '@body',
    '$I$ is 2 mA.',
    '@endbody',
    '@endstep',
    '@solution',
    'I = 2 mA',
    '@endsolution',
    '@end',
    '```',
  ].join('\n');

  it('applies an incoming @patch to the active session without followUp()', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const originalId = useStore.getState().sessions[0]!.id;
    expect(useStore.getState().sessions[0]!.capsule.steps[1]!.body).toContain('2 mA');
    c.stopWatching();

    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Series resistors',
        'qid: q1',
        'mode: patch',
        '@endmeta',
        '@patch op=replace id=s2',
        '@step id=s2',
        'title: Compute current with correct units',
        '@body',
        '$I$ is 2 A because $12/6=2\\,\\text{A}$.',
        '@endbody',
        '@endstep',
        '@endpatch',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.qid).toBe('q1');
    expect(sessions[0]!.capsule.steps[1]!.title).toContain('correct units');
    expect(adapter.editorText).not.toContain('FOLLOW-UP CONTRACT');
    c.stopWatching();
  });

  it('replaces the active session on same-qid resolve without followUp()', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const originalId = useStore.getState().sessions[0]!.id;
    c.stopWatching();

    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Series resistors',
        'qid: q1',
        'mode: resolve',
        '@endmeta',
        '@step id=a1',
        'title: Use conductance',
        '@body',
        '$G=1/R$.',
        '@endbody',
        '@endstep',
        '@step id=a2',
        'title: Sum conductances',
        '@body',
        'Then $I=VG$.',
        '@endbody',
        '@endstep',
        '@solution',
        'same I',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.qid).toBe('q1');
    expect(sessions[0]!.capsule.steps[0]!.id).toBe('a1');
    expect(adapter.editorText).not.toContain('FOLLOW-UP CONTRACT');
    c.stopWatching();
  });

  it('after inject(), native mode:new adds a session instead of replacing via lastQuestion', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    adapter.capsules = [original];
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    const originalId = useStore.getState().sessions[0]!.id;
    expect(useStore.getState().sessions[0]!.capsule.meta.qid).toBe('q1');
    c.stopWatching();

    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Biology',
        'topic: Punnett square',
        'qid: q2',
        'mode: new',
        'archetype: conceptual',
        '@endmeta',
        '@step id=s1',
        'title: Draw the square',
        '@body',
        'Alleles go on the axes.',
        '@endbody',
        '@endstep',
        '@step id=s2',
        'title: Fill cells',
        '@body',
        'Each cell is one offspring genotype.',
        '@endbody',
        '@endstep',
        '@step id=s3',
        'title: Read ratios',
        '@body',
        'Count phenotypes.',
        '@endbody',
        '@endstep',
        '@solution',
        '3:1',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.qid).toBe('q1');
    expect(sessions[1]!.capsule.meta.qid).toBe('q2');
    expect(sessions[1]!.capsule.meta.mode).toBe('new');
    expect(adapter.editorText).not.toContain('FOLLOW-UP CONTRACT');
    c.stopWatching();
  });

  it('after inject(), native qid mismatch without mode:new adds a session', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    adapter.capsules = [original];
    await new Promise((r) => setTimeout(r, 500));
    const originalId = useStore.getState().sessions[0]!.id;
    c.stopWatching();

    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Electrical',
        'topic: Series resistors',
        'qid: q2',
        '@endmeta',
        '@step id=s1',
        'title: Add the resistors',
        '@body',
        '$R_T$ is 6 ohm.',
        '@endbody',
        '@endstep',
        '@step id=s2',
        'title: Compute current',
        '@body',
        '$I$ is 2 A.',
        '@endbody',
        '@endstep',
        '@solution',
        'I = 2 A',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.id).toBe(originalId);
    expect(sessions[0]!.capsule.meta.qid).toBe('q1');
    expect(sessions[1]!.capsule.meta.qid).toBe('q2');
    expect(adapter.editorText).not.toContain('FOLLOW-UP CONTRACT');
    c.stopWatching();
  });

  it('opens a new session on mode: new without followUp()', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();

    adapter.capsules = [
      [
        '```stemlm',
        '@meta',
        'version: 2',
        'subject: Biology',
        'topic: Punnett square',
        'qid: q2',
        'mode: new',
        'archetype: conceptual',
        '@endmeta',
        '@step id=s1',
        'title: Draw the square',
        '@body',
        'Alleles go on the axes.',
        '@endbody',
        '@endstep',
        '@step id=s2',
        'title: Fill cells',
        '@body',
        'Each cell is one offspring genotype.',
        '@endbody',
        '@endstep',
        '@step id=s3',
        'title: Read ratios',
        '@body',
        'Count phenotypes.',
        '@endbody',
        '@endstep',
        '@solution',
        '3:1',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(2);
    expect(useStore.getState().sessions[1]!.capsule.meta.qid).toBe('q2');
    expect(adapter.editorText).not.toContain('FOLLOW-UP CONTRACT');
    c.stopWatching();
  });

  it('does not prepend FOLLOW-UP CONTRACT on an empty composer while watching', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = '';
    const c = new StemController(adapter);
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(adapter.editorText).toBe('');
    expect(adapter.inserted).toBe('');
    c.stopWatching();
  });
});

describe('StemController capture', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
  });

  it('captures a complete capsule into the store', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().buttonInjected).toBe(false);
    c.stopWatching();
  });

  it('captures a complete capsule even when streaming indicator is present', async () => {
    const adapter = new MockAdapter();
    adapter.streaming = true;
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('captures a ten-step capsule with all steps intact', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [TEN_STEP_BODY];
    const c = new StemController(adapter);
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const session = useStore.getState().sessions[0];
    expect(session?.capsule.steps).toHaveLength(10);
    expect(session?.capsule.steps[9]?.index).toBe(10);
    expect(useStore.getState().activeStepIndex).toBe(0);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('does not append a repair prompt after a usable answer with diagram warnings', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [WEAK_DIAGRAM_BODY];
    const c = new StemController(adapter);

    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBeUndefined();
    expect(adapter.editorText).not.toContain('Your previous stemLM capsule');
    expect(adapter.editorText).not.toContain('Re-emit the FULL answer');
    c.stopWatching();
  });

  it('clamps activeStepIndex when a retry replaces a session with fewer steps', async () => {
    const adapter = new MockAdapter();
    const question = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    adapter.editorText = question;
    const c = new StemController(adapter);

    expect(await c.inject()).toBe(true);
    adapter.capsules = [TEN_STEP_BODY];
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions[0]?.capsule.steps).toHaveLength(10);
    useStore.setState({ activeStepIndex: 9 });
    c.stopWatching();

    adapter.editorText = question;
    adapter.capsules = [CAPSULE_BODY];
    expect(await c.inject()).toBe(true);
    await new Promise((r) => setTimeout(r, 500));

    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().sessions[0]?.capsule.steps.length).toBeLessThan(10);
    expect(useStore.getState().activeStepIndex).toBeLessThan(
      useStore.getState().sessions[0]!.capsule.steps.length,
    );
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('does not stay on loading when an identical capsule is already on the page after re-inject', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();

    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    expect(await c.inject()).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('does not capture after stopWatching', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    c.stopWatching();
    await new Promise((r) => setTimeout(r, 600));
    expect(useStore.getState().sessions).toHaveLength(0);
  });

  it('does not append a repair prompt when a malformed response cannot be used', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [MALFORMED_NO_STEPS_BODY];
    const c = new StemController(adapter);

    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    expect(useStore.getState().sessions.length).toBe(0);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toContain('Parser code:');
    expect(adapter.editorText).not.toContain('Your previous stemLM capsule');
    expect(adapter.editorText).not.toContain('Re-emit the FULL answer');
    c.stopWatching();
  });
});
