import { STUDY_GUIDE_REFERENCE } from '@/src/lib/study-guide';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StemController, initController } from './controller';
import { attachTextFile } from '@/src/lib/file-inject';
import { PROTOCOL_FILENAME, STEMLM_SENTINEL } from '@/src/protocol/builder';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: false, method: 'none' as const })),
}));
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { buildLongStepCapsule, TEN_STEP_ELECTRICAL } from '@/src/protocol/__fixtures-long-steps';
import { parseCapsule } from '@/src/protocol/parser';
import { GUIDE_MAX_CHARS } from '@/src/protocol/protocol';
import { SOLUTION_ANCHOR_ID } from '@/src/lib/step-entries';

const CAPSULE_BODY = FENCED_ELECTRICAL
  .replace(/```stemlm\n/, '')
  .replace(/\n```$/, '');
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

function addRequiredContract(raw: string): string {
  return raw.replace(
    /\n@end(?:\n```)?$/,
    '\n@verify\nmethods: units\nstatus: pass\nnotes: fixture checked with 1=1\n@endverify\n@uncertainty\nassumption: fixture\n@enduncertainty\n@end\n```',
  );
}

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

describe('production protocol delivery', () => {
  beforeEach(() => {
    resetStore();
    document.body.innerHTML = '';
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
  });

  it('keeps repeat image questions compact after the file is attached', async () => {
    document.body.innerHTML = '<main><div data-message-author-role="user">Follow the attached stemlm-protocol.txt</div></main>';
    const adapter = new MockAdapter();
    adapter.composerHasAttachments = () => true;
    const controller = initController(adapter);
    expect(await controller.inject()).toBe(true);
    expect(adapter.inserted).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.inserted.length).toBeLessThan(600);
    expect(adapter.inserted).not.toContain('SCHEMA');
    expect(adapter.inserted).not.toContain('stemLM instructions');
    controller.stopWatching();
  });

  // Live Grok 2026-09-27 (signed out): the host answered each upload with "Sign in to upload files".
  // The question must still go through: the guide goes into the message as text, and stemlm says so.
  it('puts the guide into the message as text when the chat takes no upload, and says so (UX-ERR-04)', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.editorText = 'Explain the conservation of momentum.';
    const controller = initController(adapter);
    expect(await controller.inject()).toBe(true);
    expect(adapter.editorText.startsWith(`Explain the conservation of momentum.\n\n${STEMLM_SENTINEL}\n`)).toBe(true);
    expect(adapter.editorText.endsWith('End of the stemLM study guide.')).toBe(true);
    expect(adapter.editorText.length).toBeLessThan(4_000);
    expect(adapter.editorText).not.toContain(PROTOCOL_FILENAME);
    expect(useStore.getState().buttonInjected).toBe(true);
    // Attached, not sent: the panel does not wait for an answer yet, and does not open.
    expect(useStore.getState().status).toBe('idle');
    expect(useStore.getState().panelOpen).toBe(false);
    expect(useStore.getState().errorMessage).toBe('This chat did not take a file, so the guide is in your message as text.');
    controller.stopWatching();
  });

  it('reports it when the upload fails and the guide cannot be written into the chat box either', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.editorText = 'Explain the conservation of momentum.';
    adapter.insertOk = false;
    const controller = initController(adapter);
    expect(await controller.inject()).toBe(false);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/Could not add the stemlm study guide/);
    // A press of the stemlm button never opens the panel: the button itself shows the failure.
    expect(useStore.getState().panelOpen).toBe(false);
    expect(controller.takeAttachNotice()).toMatchObject({ tone: 'error' });
    expect(useStore.getState().buttonInjected).toBe(false);
    controller.stopWatching();
  });

  it('requires a visible upload acknowledgement inside the active composer', async () => {
    const adapter = new MockAdapter();
    const controller = initController(adapter);
    expect(await controller.inject()).toBe(true);
    expect(attachTextFile).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      requireConfirmation: true,
      root: document.body,
    }));
    controller.stopWatching();
  });

  it('writes an Ask-in-chat follow-up without uploading anything, so no upload can block it', async () => {
    vi.mocked(attachTextFile).mockClear();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    const controller = initController(adapter);
    expect(await controller.followUp('Momentum is conserved', 'Conserve momentum', 'Physics', { intent: 'ask' })).toBe(true);
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(adapter.editorText).toMatch(/^Ask your question here:/);
    expect(adapter.editorText).toContain('> Momentum is conserved');
    expect(adapter.editorText).toContain('@meta\nmode: resolve\n@endmeta');
    expect(adapter.editorText).not.toContain(PROTOCOL_FILENAME);
    controller.stopWatching();
  });

  it('cancels inject when the draft changes during attachment', async () => {
    let finish!: (result: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const adapter = new MockAdapter();
    adapter.editorText = 'Original draft';
    const controller = initController(adapter);
    const pending = controller.inject();
    adapter.editorText = 'Newer student draft';
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(adapter.editorText).toBe('Newer student draft');
    expect(adapter.inserted).toBe('');
    expect(useStore.getState().buttonInjected).toBe(false);
    controller.stopWatching();
  });

  it('cancels an attachment when its composer is replaced with an identical draft', async () => {
    let finish!: (result: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const adapter = new MockAdapter();
    let editor = document.createElement('textarea');
    document.body.append(editor);
    adapter.findEditor = () => editor;
    adapter.editorText = 'Same draft';
    const controller = initController(adapter);
    const pending = controller.inject();
    editor.remove();
    editor = document.createElement('textarea');
    document.body.append(editor);
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(adapter.inserted).toBe('');
    controller.stopWatching();
  });

  it('cancels an upload completion after the controller stops', async () => {
    let finish!: (result: { ok: boolean; method: 'input' }) => void;
    vi.mocked(attachTextFile).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const adapter = new MockAdapter();
    const controller = initController(adapter);
    const pending = controller.inject();
    controller.stopWatching();
    finish({ ok: true, method: 'input' });
    expect(await pending).toBe(false);
    expect(adapter.inserted).toBe('');
    expect(useStore.getState().buttonInjected).toBe(false);
  });
});

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
    expect(adapter.editorText).toContain(STUDY_GUIDE_REFERENCE);
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
      expect.stringContaining('End of the stemLM study guide.'),
      expect.objectContaining({ filename: PROTOCOL_FILENAME, preserveExisting: false }),
    );
    expect(adapter.editorText).toContain('Solve this circuit');
    expect(adapter.editorText).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.editorText).toContain(STEMLM_SENTINEL);
    expect(adapter.editorText).toContain('The attached stemLM study guide has the rest');
    expect(adapter.editorText.indexOf('Solve this circuit')).toBeLessThan(
      adapter.editorText.indexOf(STEMLM_SENTINEL),
    );
    expect(adapter.inserted).not.toContain('Solve this circuit');
    expect(adapter.editorText).not.toContain('(Electrical)');
    expect(adapter.editorText).not.toContain('OUTPUT:');
    expect(adapter.editorText).not.toContain('--- stemLM instructions');
    expect(adapter.inserted).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.inserted).not.toContain('Solve this circuit');
    expect(useStore.getState().buttonInjected).toBe(true);
    // Attached, not sent: nothing is loading yet.
    expect(useStore.getState().status).toBe('idle');
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
    expect(adapter.editorText).toContain(STUDY_GUIDE_REFERENCE);
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
    expect(adapter.editorText).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.editorText.indexOf('What is the horizontal range')).toBeLessThan(
      adapter.editorText.indexOf(STUDY_GUIDE_REFERENCE),
    );
    c.stopWatching();
  });

  it('attaches the guide for the question\'s own subject, with the keys of every other figure type', async () => {
    const question = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const adapter = new MockAdapter();
    adapter.editorText = question;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    const file = vi.mocked(attachTextFile).mock.calls.at(-1)?.[0] as string;
    expect(file).toContain('COMMON MISTAKES IN ELECTRICAL');
    expect(file).toContain('@diagram type=circuit');
    expect(file).not.toContain('@diagram type=gel');
    expect(file).toMatch(/^type=gel: /m);
    expect(file.length).toBeLessThanOrEqual(GUIDE_MAX_CHARS);
    expect(adapter.inserted).not.toContain('Electrical');
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
    expect(adapter.editorText).toContain(STEMLM_SENTINEL);
    expect(adapter.editorText).toContain('@meta');
    expect(adapter.editorText).toContain('@diagram type=circuit');
    expect(adapter.editorText.endsWith('End of the stemLM study guide.')).toBe(true);
    expect(adapter.inserted.length).toBeLessThan(4_000);
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
      expect(text).toContain(STUDY_GUIDE_REFERENCE);
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
    expect(adapter.inserted.startsWith(STEMLM_SENTINEL)).toBe(true);
    expect(adapter.inserted).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.inserted.length).toBeLessThan(400);
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
    vi.mocked(attachTextFile).mockClear();

    expect(await c.inject()).toBe(true);
    // The chat already has the guide for this subject: only the reminder goes, and nothing is uploaded.
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(adapter.inserted.startsWith(STEMLM_SENTINEL)).toBe(true);
    expect(adapter.inserted).toContain('The stemLM study guide earlier in this chat has the rest.');
    expect(adapter.inserted.length).toBeLessThan(400);
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
    expect(adapter.inserted.startsWith(STEMLM_SENTINEL)).toBe(true);
    expect(adapter.inserted.length).toBeLessThan(400);
    c.stopWatching();
  });

  it('uses a pointer, not leftover dump, when a photo is attached and file attach fails', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.editorText = '';
    adapter.composerHasAttachments = () => true;
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(adapter.inserted).toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.inserted).toContain(STEMLM_SENTINEL);
    expect(adapter.inserted).not.toContain('DIAGRAM REGISTRY');
    expect(adapter.inserted).not.toContain('anatomy\tleftover');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    c.stopWatching();
  });

  it('does not accept a generic media attachment as protocol fallback confirmation', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
    const adapter = new MockAdapter();
    adapter.composerHasAttachments = () => true;
    adapter.insertPrompt = (text: string) => {
      adapter.inserted = text;
      // Model a host that reports the existing image/PDF but drops the inline
      // protocol fallback instead of inserting it.
      adapter.editorText = '';
      return true;
    };
    const c = new StemController(adapter);

    expect(await c.inject()).toBe(false);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('seeds visible capsules before a fresh injection so stale DOM is not captured', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve a newly typed circuit question';
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);

    expect(await c.inject()).toBe(true);
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(0);

    c.stopWatching();
    adapter.capsules = [
      CAPSULE_BODY,
      CAPSULE_BODY.replace('Circuit format check', 'Newly generated circuit'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().sessions[0]!.capsule.meta.topic).toBe('Newly generated circuit');
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
    // The student sends: the chat box empties and the reply begins.
    adapter.editorText = '';
    adapter.capsules = ['Working through the circuit.'];
    await new Promise((r) => setTimeout(r, 450));
    expect(useStore.getState().status).toBe('loading');

    const ok = await c.followUp('Why is R1 + R2 here?', 'Series resistors', 'Electrical');
    expect(ok).toBe(false);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toContain('Wait for the current answer');
    c.stopWatching();
  });

  it('writes the whole follow-up into the chat box: the context, the answer shape and no guide', async () => {
    vi.mocked(attachTextFile).mockClear();
    const adapter = new MockAdapter();
    adapter.composerHasAttachments = () => true;
    const c = new StemController(adapter);

    const ok = await c.followUp(
      'Why is total resistance R1 + R2 here?',
      'Combine series resistors',
      'Electrical',
    );
    expect(ok).toBe(true);
    expect(attachTextFile).not.toHaveBeenCalled();
    expect(adapter.inserted).toContain('stemLM follow-up context');
    expect(adapter.inserted).toContain('("Combine series resistors")');
    expect(adapter.inserted).toContain('@meta\nmode: patch\n@endmeta');
    expect(adapter.inserted).not.toContain(STUDY_GUIDE_REFERENCE);
    expect(adapter.inserted).not.toContain('End of the stemLM study guide.');
    expect(adapter.inserted.length).toBeLessThan(700);
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
    const withIds = addRequiredContract([
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
    ].join('\n'));
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
    adapter.capsules = [CAPSULE_BODY];
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
    adapter.capsules = [CAPSULE_BODY];
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
      CAPSULE_BODY,
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
    const original = addRequiredContract([
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
    ].join('\n'));
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
        '@verify',
        'methods: backsub',
        'status: pass',
        'notes: fixture checked with 1=1',
        '@endverify',
        '@uncertainty',
        'assumption: fixture',
        '@enduncertainty',
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

describe('CAP-OBS-01 replaced conversation root', () => {
  beforeEach(resetStore);

  it('keeps capturing after the host replaces the element it was watching', async () => {
    document.body.replaceChildren(document.createElement('main'));
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    c.startWatching();
    // Let the initial check run on the empty page first.
    await new Promise((r) => setTimeout(r, 600));
    expect(useStore.getState().sessions).toHaveLength(0);
    const fresh = document.createElement('main');
    document.querySelector('main')!.replaceWith(fresh);
    adapter.capsules = [CAPSULE_BODY];
    await new Promise((r) => setTimeout(r, 2200));
    fresh.append(document.createTextNode('answer arrives'));
    await vi.waitFor(() => expect(useStore.getState().sessions).toHaveLength(1), { timeout: 3000 });
    c.stopWatching();
  }, 10_000);
});

describe('FOLLOW-01 typed follow-up question source', () => {
  it('reads the question from sent user messages, never from the composer draft', () => {
    const header = '--- stemLM follow-up context (do not remove) ---';
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.textContent = `Draft still being typed\n\n${header}\nStep context`;
    document.body.replaceChildren(editor);
    const c = new StemController(new MockAdapter());
    const extract = () => (c as unknown as { extractTypedFollowupQuestion(): string | undefined }).extractTypedFollowupQuestion();
    expect(extract()).toBeUndefined();
    const sent = document.createElement('div');
    sent.setAttribute('data-testid', 'user-message');
    sent.textContent = `Why does friction not matter here?\n\n${header}\nStep context`;
    document.body.append(sent);
    expect(extract()).toBe('Why does friction not matter here?');
    c.stopWatching();
  });
});

describe('DISABLED-01 answer started while stemLM is off', () => {
  beforeEach(resetStore);

  it.each([
    [false, 0],
    [true, 1],
  ])('stemlmEnabled=%s fires the auto-open hook %i time(s)', async (enabled, calls) => {
    useStore.setState({ settings: { ...useStore.getState().settings, stemlmEnabled: enabled } });
    const adapter = new MockAdapter();
    adapter.streaming = true;
    const c = new StemController(adapter);
    const onStarted = vi.fn();
    c.setOnAnswerStarted(onStarted);
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(onStarted).toHaveBeenCalledTimes(calls);
    c.stopWatching();
    useStore.setState({ settings: { ...useStore.getState().settings, stemlmEnabled: true } });
  });
});

describe('INJ-01 attach abandoned mid-way', () => {
  beforeEach(resetStore);

  it('tells the student when the chat box changed while the guide was attaching', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Find the acceleration of a 2 kg block on a 30 degree incline.';
    vi.mocked(attachTextFile).mockImplementationOnce(async () => {
      adapter.editorText = 'A different question typed meanwhile';
      return { ok: true, method: 'input' };
    });
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(false);
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/changed while stemlm was attaching/);
    expect(useStore.getState().buttonInjected).toBe(false);
    c.stopWatching();
  });

  // A second press used to start a second attempt that took over from the first, and both
  // uploaded. Now it joins the press already at work: one upload, one result, nothing to report.
  it('joins the press already at work instead of starting a second one', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Find the range of a projectile.';
    const c = new StemController(adapter);
    let release: () => void = () => {};
    vi.mocked(attachTextFile).mockClear();
    vi.mocked(attachTextFile).mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve({ ok: true, method: 'input' });
    }));
    const first = c.inject();
    await Promise.resolve();
    const second = c.inject();
    release();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(attachTextFile).toHaveBeenCalledTimes(1);
    expect(useStore.getState().errorMessage ?? '').not.toMatch(/changed while/);
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

  it('LOAD-01 keeps sessions the page does not show and the follow-ups of reloaded ones', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);
    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    const loaded = useStore.getState().sessions[0]!;
    useStore.getState().addFollowup(loaded.id, {
      id: 'fu-1', anchorStepId: loaded.capsule.steps[0]!.id, question: 'Why?', capsule: loaded.capsule, createdAt: 1,
    });
    const restored = {
      ...loaded,
      id: 'restored-other-chat',
      raw: 'restored',
      followups: undefined,
      capsule: { ...loaded.capsule, meta: { ...loaded.capsule.meta, topic: 'A question from another chat' } },
    };
    useStore.setState({ sessions: [restored, useStore.getState().sessions[0]!], activeSessionId: restored.id });

    expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
    const after = useStore.getState().sessions;
    expect(after.map((s) => s.id)).toEqual(['restored-other-chat', loaded.id]);
    expect(after[1]!.followups?.map((f) => f.id)).toEqual(['fu-1']);
    expect(useStore.getState().activeSessionId).toBe(loaded.id);
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
    const part2 = addRequiredContract([
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
    ].join('\n'));
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

  const original = addRequiredContract([
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
  ].join('\n'));

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

  it('rejects an unknown-id patch instead of reporting an unchanged repair as ready', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [original];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const before = useStore.getState().sessions[0]!;
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
        '@patch op=replace id=s999',
        '@step id=s999',
        'title: Ghost repair',
        '@body',
        'This must not be applied.',
        '@endbody',
        '@endstep',
        '@endpatch',
        '@end',
        '```',
      ].join('\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.capsule).toEqual(before.capsule);
    expect(state.status).toBe('error');
    expect(state.errorMessage).toMatch(/repair.*not applied|unknown id/i);
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
        '@verify',
        'methods: backsub',
        'status: pass',
        'notes: fixture checked with 1=1',
        '@endverify',
        '@uncertainty',
        'assumption: fixture',
        '@enduncertainty',
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
        '@verify',
        'methods: backsub',
        'status: pass',
        'notes: fixture checked with 1=1',
        '@endverify',
        '@uncertainty',
        'assumption: fixture',
        '@enduncertainty',
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
        '@verify',
        'methods: backsub',
        'status: pass',
        'notes: fixture checked with 1=1',
        '@endverify',
        '@uncertainty',
        'assumption: fixture',
        '@enduncertainty',
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

  it('does not accept a complete capsule above the declared step limit', () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const tryCapture = (
      c as unknown as { tryCapture: (raw: string, complete: boolean) => void }
    ).tryCapture.bind(c);

    c.startWatching();
    const oversized = buildLongStepCapsule(21).replace(/```stemlm\n/, '').replace(/\n```$/, '');
    // This direct call exercises the same parse/contract gate as DOM capture
    // without making the regression depend on debounce timers.
    tryCapture(oversized, true);
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('does not accept an oversized nested question', () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const tryCapture = (
      c as unknown as { tryCapture: (raw: string, complete: boolean) => void }
    ).tryCapture.bind(c);
    const nested = [
      '@meta',
      'version: 2',
      'subject: Math',
      'topic: Nested parts',
      '@endmeta',
      '@q id=q1',
      'topic: Part one',
      ...Array.from({ length: 21 }, (_, index) => [
        `@step id=q1.s${index + 1}`,
        `title: Move ${index + 1}`,
        '@body',
        'Apply the declared transformation.',
        '@endbody',
        '@endstep',
      ].join('\n')),
      '@endq',
      '@end',
    ].join('\n');

    c.startWatching();
    tryCapture(nested, true);
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });

  it('does not append a repair prompt after a usable answer with diagram warnings', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [addRequiredContract(WEAK_DIAGRAM_BODY)];
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
    adapter.capsules = [];
    expect(await c.inject()).toBe(true);
    c.stopWatching();
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
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
    // Attached, not sent: the answer already in the panel stays in view, and nothing loads.
    expect(useStore.getState().status).toBe('ready');
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

  it('CAP-03 leaves loading after stable off-protocol prose and permits retry', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.editorText = 'Find the acceleration from the given forces.';
      const injected = c.inject();
      await vi.advanceTimersByTimeAsync(100);
      expect(await injected).toBe(true);
      // The student sends: the chat box empties, and the reply is not an answer.
      adapter.editorText = '';
      adapter.capsules = ['Please clarify which force acts horizontally.'];
      await vi.advanceTimersByTimeAsync(11_000);
      // The chat asked back instead of answering: the panel stops waiting and says so in a note.
      expect(useStore.getState().status).toBe('idle');
      expect(useStore.getState().errorMessage).toMatch(/no stemlm answer/i);
      expect(useStore.getState().buttonInjected).toBe(false);
      adapter.editorText = 'The applied force acts horizontally. Find the acceleration.';
      const retry = c.inject();
      await vi.advanceTimersByTimeAsync(500);
      expect(await retry).toBe(true);
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it('CAP-STREAM-01 waits through a mid-stream pause while the provider is still streaming', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.editorText = 'Find the current in the series circuit.';
      const injected = c.inject();
      await vi.advanceTimersByTimeAsync(100);
      expect(await injected).toBe(true);
      adapter.streaming = true;
      adapter.capsules = [CAPSULE_BODY.slice(0, Math.floor(CAPSULE_BODY.length / 2))];
      document.body.append(document.createTextNode('.'));
      await vi.advanceTimersByTimeAsync(4_000);
      expect(useStore.getState().status).not.toBe('error');
      expect(useStore.getState().errorMessage).toBeUndefined();

      adapter.streaming = false;
      adapter.capsules = [CAPSULE_BODY];
      document.body.append(document.createTextNode('.'));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(useStore.getState().status).toBe('ready');
      expect(useStore.getState().sessions).toHaveLength(1);
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it('CAP-STREAM-01 reports a partial answer only after a long stall without a streaming indicator', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.editorText = 'Find the current in the series circuit.';
      const injected = c.inject();
      await vi.advanceTimersByTimeAsync(100);
      expect(await injected).toBe(true);
      adapter.capsules = [CAPSULE_BODY.slice(0, Math.floor(CAPSULE_BODY.length / 2))];
      document.body.append(document.createTextNode('.'));
      await vi.advanceTimersByTimeAsync(5_000);
      expect(useStore.getState().status).not.toBe('error');
      await vi.advanceTimersByTimeAsync(6_000);
      expect(useStore.getState().status).toBe('error');
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it('CAP-STREAM-01 keeps an Ask-in-chat anchor through a paused answer and attaches it to the step', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.capsules = [CAPSULE_BODY];
      c.startWatching();
      await vi.advanceTimersByTimeAsync(500);
      const original = useStore.getState().sessions[0]!;
      c.stopWatching();

      const asked = c.followUp('Problem: circuit\nStep 1 of 2: Add resistors', 'Add resistors', 'Electrical', {
        intent: 'ask',
        anchor: { sessionId: original.id, anchorStepId: original.capsule.steps[0]!.id },
      });
      await vi.advanceTimersByTimeAsync(500);
      expect(await asked).toBe(true);

      const answer = [
        '@meta', 'version: 2', 'subject: Electrical', 'topic: Why series adds', 'qid: q1', 'mode: resolve', '@endmeta',
        '@step id=s1', 'title: Series carries one current', '@body',
        'The same current flows through both, so the voltage drops add.', '@endbody', '@endstep',
        '@solution', 'Resistances add in series.', '@endsolution', '@end',
      ].join('\n');
      adapter.streaming = true;
      adapter.capsules = [CAPSULE_BODY, answer.slice(0, answer.indexOf('@solution'))];
      document.body.append(document.createTextNode('.'));
      await vi.advanceTimersByTimeAsync(4_000);
      expect(useStore.getState().status).not.toBe('error');

      adapter.streaming = false;
      adapter.capsules = [CAPSULE_BODY, answer];
      document.body.append(document.createTextNode('.'));
      await vi.advanceTimersByTimeAsync(1_000);
      const state = useStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0]!.followups).toHaveLength(1);
      expect(state.sessions[0]!.followups![0]!.anchorStepId).toBe(original.capsule.steps[0]!.id);
      // An Ask-in-chat mini-answer never carries @verify/@uncertainty: no D11 notice.
      expect(state.errorMessage).toBeUndefined();
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it.each([false, true])('CAP-04 abandons anchored follow-up on a fresh question (resetInjection: %s)', async (reset) => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.capsules = [CAPSULE_BODY];
      expect(await c.loadConversation({ maxWaitMs: 0 })).toBe(1);
      const guide = document.createElement('p');
      guide.textContent = PROTOCOL_FILENAME;
      document.body.append(guide);
      const original = useStore.getState().sessions[0]!;
      expect(await c.followUp('Explain the current relation', 'Current', 'Electrical', {
        anchor: { sessionId: original.id, anchorStepId: original.capsule.steps[0]!.id },
      })).toBe(true);
      if (reset) c.resetInjection();
      const question = 'Find the energy dissipated by a different resistor.';
      adapter.editorText = question;
      expect(await c.inject()).toBe(true);
      adapter.capsules = [CAPSULE_BODY.replace(/^qid:.*\n/gm, '').replace(/^question:.*$/m, `question: ${question}`)];
      document.body.append(document.createTextNode('.'));
      // The panel already shows an answer ("ready"), so wait for the new one itself.
      await vi.waitFor(() => {
        const active = useStore.getState().sessions.find((s) => s.id === useStore.getState().activeSessionId)!;
        expect(active.question).toBe(question);
      });
      expect(useStore.getState().status).toBe('ready');
    } finally {
      c.stopWatching();
    }
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

  it('leads an unreadable-answer error with what to do, keeping the parser code as a detail line (UX-ERR-01)', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [MALFORMED_NO_STEPS_BODY];
    const c = new StemController(adapter);

    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    const [lead, ...detail] = (useStore.getState().errorMessage ?? '').split('\n');
    expect(lead).not.toMatch(/parser|code|capsule/i);
    // The message names the control to press, as it is drawn now: the stemlm button, not a plus.
    expect(lead).toMatch(/\bstemlm button\b/);
    expect(lead).not.toMatch(/\+/);
    expect(detail.join('\n')).toMatch(/^Parser code: \w+\.$/);
    c.stopWatching();
  });

  // Live 2026-09-27: Grok "High Demand" and Gemini "Sorry, something went wrong" replies were
  // reported as answers stemlm "couldn't read".
  // Live Grok 2026-09-27: the chat stopped mid-step 6 (no @end) and stemlm said it "couldn't read" it.
  it('says an answer the chat cut off stopped early and can be continued (UX-ERR-05)', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.editorText = 'Find the current from the battery.';
      const injected = c.inject();
      await vi.advanceTimersByTimeAsync(100);
      expect(await injected).toBe(true);
      adapter.capsules = [CAPSULE_BODY.replace(/@end\s*$/, '').replace(/@verify[\s\S]*$/, '@step id=s9\ntitle: Verify\n@body\nCurrents through the')];
      await vi.advanceTimersByTimeAsync(25_000);

      const [lead, ...detail] = (useStore.getState().errorMessage ?? '').split('\n');
      console.log('MISSING_END_MESSAGE', JSON.stringify(useStore.getState().errorMessage));
      expect(lead).toMatch(/stopped before the end/i);
      expect(lead).toMatch(/continue/i);
      // The message names the control to press, as it is drawn now: the stemlm button, not a plus.
      expect(lead).toMatch(/\bstemlm button\b/);
      expect(lead).not.toMatch(/\+/);
      expect(lead).not.toMatch(/parser|code|capsule/i);
      // D38: its closed steps are shown (cut off, unsaveable) with this notice, not an error.
      expect(detail).toEqual([]);
      expect(useStore.getState().status).toBe('ready');
      expect(useStore.getState().sessions.map((s) => [s.cutOff, s.capsule.steps.length])).toEqual([[true, 2]]);
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it('says a reply with no stemlm answer at all may be a chat error or limit (UX-ERR-02)', async () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    try {
      adapter.editorText = 'Find the current from the battery.';
      const injected = c.inject();
      await vi.advanceTimersByTimeAsync(100);
      expect(await injected).toBe(true);
      // The student sends: the chat box empties, and the chat answers with a notice of its own.
      adapter.editorText = '';
      adapter.capsules = ['Grok is under heavy usage right now. Please try again later or upgrade your plan.'];
      await vi.advanceTimersByTimeAsync(11_000);

      const [lead, ...detail] = (useStore.getState().errorMessage ?? '').split('\n');
      console.log('NO_CAPSULE_MESSAGE', JSON.stringify(useStore.getState().errorMessage));
      expect(lead).toMatch(/no stemlm answer/i);
      expect(lead).toMatch(/error|limit/i);
      // The message names the control to press, as it is drawn now: the stemlm button, not a plus.
      expect(lead).toMatch(/\bstemlm button\b/);
      expect(lead).not.toMatch(/\+/);
      expect(lead).not.toMatch(/parser|code|capsule/i);
      // A note about the chat's reply, not an error of stemLM's: no parser code under it, no red.
      expect(detail).toEqual([]);
      expect(useStore.getState().status).toBe('idle');
    } finally {
      c.stopWatching();
      vi.useRealTimers();
    }
  });

  it('keeps a stable partial pending and reconciles it when the final capsule arrives', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const partial = CAPSULE_BODY.replace(/\n@end\n?$/, '');
    adapter.capsules = [partial];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 2000));

    expect(useStore.getState().sessions).toHaveLength(0);

    c.stopWatching();
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().sessions[0]!.raw).toContain('@end');
    expect(useStore.getState().sessions[0]!.capsule.steps).toHaveLength(2);
    c.stopWatching();
  });

  it('flushes a mismatched resume fragment before accepting the next complete answer', () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    c.startWatching();
    const tryCapture = (
      c as unknown as { tryCapture: (raw: string, complete: boolean) => void }
    ).tryCapture.bind(c);
    const abandoned = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Physics',
      'topic: Abandoned answer',
      'qid: qa',
      '@endmeta',
      '@step id=abandoned',
      'title: Abandoned step',
      '@body',
      'This fragment must not be stitched into another answer.',
      '@endbody',
      '@endstep',
      '@resume token=tokenA',
      '```',
    ].join('\n');
    const independentB = CAPSULE_BODY.replace(
      'Circuit format check',
      'Independent B\nqid: qb\nmode: new',
    ).replace('\n@end\n```', '\n@resume token=tokenB\n@end\n```');
    const independentC = CAPSULE_BODY.replace(
      'Circuit format check',
      'Independent C\nqid: qc\nmode: new',
    );

    tryCapture(abandoned, false);
    tryCapture(independentB, true);
    tryCapture(independentC, true);

    const sessions = useStore.getState().sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions[1]!.capsule.meta.qid).toBe('qc');
    expect(sessions[1]!.capsule.steps.map((step) => step.id)).toEqual(['step-1', 'step-2']);
    c.stopWatching();
  });

  // D11 (2026-09-24): a finished answer missing optional closing blocks is shown
  // with a soft notice instead of being rejected with every step lost.
  it('PARSE-02 stores a finished capsule without its check and assumptions, with a soft notice', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [
      CAPSULE_BODY
        .replace(/\n@verify[\s\S]*?@endverify\n/, '\n')
        .replace(/\n@uncertainty[\s\S]*?@enduncertainty\n/, '\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().sessions[0]!.capsule.steps).toHaveLength(2);
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBe(
      'This answer arrived without its final check and assumptions. The steps are complete; double-check the final result.',
    );
    c.stopWatching();
  });

  // D30 (2026-09-27, autopilot): a finished answer with a malformed @verify is kept,
  // shown as not verified, instead of losing every step.
  it('PARSE-04 stores a finished capsule whose check is malformed, marked not verified, with a soft notice', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    const body = CAPSULE_BODY.replace(/(@verify\n)[\s\S]*?(@endverify)/, '$1methods: vibes\nstatus: unsure\nnotes: looks right\n$2');
    expect(body).toContain('status: unsure');
    adapter.capsules = [body];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const [session] = useStore.getState().sessions;
    expect(session?.capsule.steps.length).toBeGreaterThan(0);
    expect(session?.capsule.verification?.status).toBe('fail');
    expect(session?.capsule.verification?.correction).toBeTruthy();
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().errorMessage).toBe(
      'The final check in this answer was incomplete, so the result is shown as not verified. Double-check it.',
    );
    c.stopWatching();
  });

  it('PARSE-02 names a missing summary in the notice and still rejects a capsule without @end', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY.replace(/\n@solution[\s\S]*?@endsolution\n/, '\n')];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().errorMessage).toContain('without its summary.');
    c.stopWatching();

    useStore.getState().resetSessions();
    adapter.capsules = [
      CAPSULE_BODY.replace(/\n@verify[\s\S]*?@endverify\n/, '\n').replace(/\n@end\s*$/, '\n'),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(0);
    c.stopWatching();
  });

  it('routes a mismatched anchored qid/mode as an ordinary new session', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const original = useStore.getState().sessions[0]!;
    c.stopWatching();

    await c.followUp('Explain the next problem.', 'Result', 'Electrical', {
      intent: 'ask',
      anchor: { sessionId: original.id, anchorStepId: original.capsule.steps[0]!.id },
    });
    adapter.capsules = [
      CAPSULE_BODY.replace(
        'topic: Circuit format check',
        'topic: Independent circuit\nqid: q2\nmode: new',
      ),
    ];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(2);
    expect(useStore.getState().sessions[0]!.followups ?? []).toHaveLength(0);
    c.stopWatching();
  });

  it('does not let a malformed follow-up capture poison the next same-topic question', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();

    await c.followUp('Explain the resistor combination.', 'Label the circuit', 'Electrical');
    adapter.capsules = [MALFORMED_NO_STEPS_BODY];
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().status).toBe('error');

    adapter.editorText = 'Solve a different circuit with the same topic label.';
    // A model may omit @meta question on a later turn; the new prompt text is
    // then the session identity while the topic remains unchanged.
    adapter.capsules = [];
    expect(await c.inject()).toBe(true);
    // A real host mutation schedules the already-running watcher; restart it
    // here to model that new assistant turn deterministically.
    c.stopWatching();
    adapter.capsules = [CAPSULE_BODY.replace('question: Structural fixture — not a stored solution.\n', '')];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));

    expect(useStore.getState().sessions).toHaveLength(2);
    c.stopWatching();
  });
});

describe('StemController generic patch routing', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
  });

  const GOOD_SCENE = [
    'kind: geom',
    'point: A 0 0',
    'point: B 0 1',
    'point: C 1 1',
    'segment: wavefront A B',
    'segment: ray B C',
    'relation: perpendicular wavefront ray',
  ];

  function opticsCapsule(qid: string, topic: string): string {
    return [
      '@meta',
      'version: 2',
      'subject: Physics',
      `topic: ${topic}`,
      `question: A beam crosses a slab (${topic}). Find the deflection.`,
      `qid: ${qid}`,
      '@endmeta',
      '@step id=s1',
      'title: Read the slab geometry',
      '@body',
      'The source fixes the slab thickness $d$ and the index gradient.',
      '@endbody',
      '@endstep',
      '@step id=s2',
      'title: Draw the emergent wavefront and ray',
      '@formula id=e1',
      '$$\\Delta L=(n_2-n_1)d$$',
      '@endformula',
      '@body',
      'The wavefront normal gives the outgoing ray direction.',
      '@endbody',
      '@diagram id=f1 type=scene',
      'kind: geom',
      'point: A 0 0',
      '@enddiagram',
      '@takeaway',
      'A wavefront is always normal to its ray.',
      '@endtakeaway',
      '@quickcheck',
      'q: Which way does the ray bend?',
      'a: Toward the higher index, because the optical path is longer there.',
      '@endquickcheck',
      '@followup',
      'What happens when the gradient reverses?',
      '@endfollowup',
      '@endstep',
      '@verify',
      'methods: units',
      'status: pass',
      'notes: checked $\\Delta L=(n_2-n_1)d$ with $d=2$ giving $\\Delta L=0.02$',
      '@endverify',
      '@uncertainty',
      'assumption: thin-slab approximation',
      '@enduncertainty',
      '@solution',
      `The beam deflects by $\\theta$ (${topic}).`,
      '@endsolution',
      '@end',
    ].join('\n');
  }

  function patchCapsule(opt: { qid: string }): string {
    return [
      '@meta',
      'version: 2',
      'subject: Physics',
      'topic: Graded-index slab',
      `qid: ${opt.qid}`,
      'mode: patch',
      '@endmeta',
      '@patch op=replace id=s2',
      '@step id=s2',
      'title: Draw the emergent wavefront and ray',
      '@body',
      'The wavefront normal gives the outgoing ray direction.',
      '@endbody',
      '@diagram id=f1 type=scene',
      ...GOOD_SCENE,
      '@enddiagram',
      '@endstep',
      '@endpatch',
      '@end',
    ].join('\n');
  }

  async function seedSession(c: StemController, adapter: MockAdapter, qid: string, topic: string) {
    adapter.capsules = [opticsCapsule(qid, topic)];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    c.stopWatching();
    adapter.capsules = [];
  }

  async function deliver(c: StemController, adapter: MockAdapter, raw: string) {
    adapter.capsules = [raw];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    c.stopWatching();
  }

  it('refuses a generic patch whose qid does not match the active answer', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    await seedSession(c, adapter, 'q2', 'Prism deflection');
    const before = JSON.stringify(useStore.getState().sessions[0]!.capsule);

    await deliver(c, adapter, patchCapsule({ qid: 'q1' }));

    expect(useStore.getState().sessions).toHaveLength(1);
    expect(JSON.stringify(useStore.getState().sessions[0]!.capsule)).toBe(before);
    expect(useStore.getState().status).toBe('error');
  });
});

describe('AUTO-OPEN-01 the answer-started hook fires only for an answer stemLM asked for', () => {
  class PageAdapter extends MockAdapter {
    blocks = 0;
    getAssistantBlocks(): never[] {
      return Array.from({ length: this.blocks }, () => document.createElement('div')) as never[];
    }
  }
  const settle = () => new Promise((r) => setTimeout(r, 500));
  // Watch a <main> of our own so stray body mutations cannot keep re-arming the debounce.
  const mutate = () => document.querySelector('main')!.append(document.createElement('span'));

  beforeEach(() => {
    resetStore();
    document.body.innerHTML = '<main></main>';
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
  });

  it('stays quiet when a restored or shared tab starts watching a finished chat', async () => {
    const adapter = new PageAdapter();
    adapter.blocks = 2;
    adapter.capsules = [FENCED_ELECTRICAL];
    const c = new StemController(adapter);
    const onStarted = vi.fn();
    c.setOnAnswerStarted(onStarted);
    c.startWatching();
    await settle();
    expect(onStarted).not.toHaveBeenCalled();

    // An ordinary chat answer the student did not route through stemLM.
    adapter.blocks = 3;
    adapter.streaming = true;
    mutate();
    await settle();
    expect(onStarted).not.toHaveBeenCalled();
    c.stopWatching();
  });

  it('waits for the new answer when the chat already shows an earlier stemLM answer', async () => {
    const adapter = new PageAdapter();
    adapter.blocks = 1;
    adapter.capsules = [FENCED_ELECTRICAL];
    adapter.editorText = 'Find the current through a 6 ohm resistor on a 12 V supply.';
    const c = new StemController(adapter);
    const onStarted = vi.fn();
    c.setOnAnswerStarted(onStarted);
    expect(await c.inject()).toBe(true);
    mutate();
    await settle();
    expect(onStarted).not.toHaveBeenCalled();

    adapter.editorText = '';
    adapter.blocks = 2;
    adapter.streaming = true;
    mutate();
    // The debounce runs on real timers: wait for the call itself, since a fixed pause is too short
    // when the whole suite is running.
    await vi.waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1), { timeout: 5000, interval: 50 });
    await settle();
    expect(onStarted).toHaveBeenCalledTimes(1);
    c.stopWatching();
  });
});
