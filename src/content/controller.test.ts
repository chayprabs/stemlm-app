import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StemController } from './controller';
import { attachTextFile } from '@/src/lib/file-inject';
import { PROTOCOL_FILENAME } from '@/src/protocol/builder';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: false, method: 'none' as const })),
}));
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { TEN_STEP_ELECTRICAL } from '@/src/protocol/__fixtures-long-steps';

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
  findEditor() {
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
    vi.mocked(attachTextFile).mockResolvedValue({ ok: false, method: 'none' });
  });

  it('uses file attach on an empty composer when upload succeeds', async () => {
    vi.mocked(attachTextFile).mockResolvedValue({ ok: true, method: 'input' });
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

  it('pastes the full protocol prompt into the composer', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.editorText).toContain('Solve this circuit');
    expect(adapter.editorText).toContain('OUTPUT:');
    expect(adapter.editorText).toContain('ELECTRICAL');
    expect(adapter.editorText).toContain('stemLM instructions');
    expect(adapter.editorText).not.toContain('stemlm-protocol.txt');
    expect(adapter.inserted).toContain('stemLM instructions');
    expect(adapter.inserted).not.toContain('Solve this circuit');
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.stopWatching();
  });

  it('appends the protocol when only an image attachment is present', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = '';
    adapter.composerHasAttachments = () => true;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.editorText).toContain('stemLM instructions');
    expect(adapter.inserted).toContain('stemLM instructions');
    c.stopWatching();
  });

  it('appends the protocol when the composer already has a question', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'What is the horizontal range of this projectile?';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.editorText).toMatch(/^What is the horizontal range/);
    expect(adapter.editorText).toContain('stemLM instructions');
    expect(adapter.editorText.indexOf('What is the horizontal range')).toBeLessThan(
      adapter.editorText.indexOf('stemLM instructions'),
    );
    c.stopWatching();
  });

  it('auto-classifies the subject from the question text', async () => {
    const question = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const adapter = new MockAdapter();
    adapter.editorText = question;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.inserted).toContain('ELECTRICAL');
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
});

describe('StemController.followUp', () => {
  beforeEach(resetStore);

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
    c.stopWatching();
  });

  it('adds a new session for follow-up answers instead of replacing the original', async () => {
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
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.id).toBe(originalId);
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
});

describe('StemController capture', () => {
  beforeEach(resetStore);

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
