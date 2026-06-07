import { describe, it, expect, beforeEach } from 'vitest';
import { StemController } from './controller';
import { geminiAdapter } from '@/src/platforms/gemini';
import { useStore } from '@/src/state/store';
import { FENCED_CHEMISTRY, FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { CHEMISTRY_DIAGRAM_REQUIREMENT } from '@/src/protocol/builder';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');
const CHEM_CAPSULE_BODY = FENCED_CHEMISTRY.replace(/```stemlm\n/, '').replace(/\n```$/, '');

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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * End-to-end through the REAL Gemini adapter against a simulated page DOM:
 * type a question -> paste full protocol -> assistant replies ->
 * MutationObserver captures -> store holds a parsed session.
 */
describe('integration: Gemini adapter + controller capture', () => {
  beforeEach(() => {
    resetStore();
    document.body.innerHTML = `
      <rich-textarea>
        <div class="ql-editor" contenteditable="true" role="textbox"></div>
      </rich-textarea>
      <button aria-label="Send message">Send</button>
      <div id="thread"></div>
    `;
  });

  it('pastes the full protocol, then captures the answer', async () => {
    const editor = geminiAdapter.findEditor()!;
    editor.textContent =
      'Find the current in this 12V series resistor circuit (Kirchhoff).';

    const c = new StemController(geminiAdapter);
    const ok = await c.inject();
    expect(ok).toBe(true);

    const injected = geminiAdapter.getEditorText();
    expect(injected).toContain('12V series resistor');
    expect(injected).toContain('OUTPUT:');
    expect(injected).toContain('stemLM instructions');
    expect(injected).not.toContain('stemlm-protocol.txt');
    expect(injected).not.toContain('Follow the attached');
    expect(useStore.getState().status).toBe('loading');

    const thread = document.getElementById('thread')!;
    const msg = document.createElement('model-response');
    const codeBlock = document.createElement('code-block');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = CAPSULE_BODY;
    pre.appendChild(code);
    codeBlock.appendChild(pre);
    msg.appendChild(codeBlock);
    thread.appendChild(msg);

    await wait(600);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.status).toBe('ready');
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Electrical');
    expect(state.sessions[0]!.capsule.steps.length).toBeGreaterThanOrEqual(2);
    expect(state.sessions[0]!.platform).toBe('gemini');
    c.stopWatching();
  });

  it('captures complete capsules even when a stop (streaming) button is present', async () => {
    const c = new StemController(geminiAdapter);
    c.startWatching();

    document.body.insertAdjacentHTML(
      'beforeend',
      '<button aria-label="Stop response">Stop</button>',
    );
    const thread = document.getElementById('thread')!;
    const msg = document.createElement('model-response');
    const codeBlock = document.createElement('code-block');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = CAPSULE_BODY;
    pre.appendChild(code);
    codeBlock.appendChild(pre);
    msg.appendChild(codeBlock);
    thread.appendChild(msg);

    await wait(600);
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();
  });

  it('injects chemistry protocol and captures AI-generated capsule', async () => {
    const editor = geminiAdapter.findEditor()!;
    editor.textContent =
      'Balance $\\ce{H2 + O2 -> H2O}$ and find moles of water from 2 mol $\\ce{H2}$.';

    const c = new StemController(geminiAdapter);
    const ok = await c.inject();
    expect(ok).toBe(true);

    const injected = geminiAdapter.getEditorText();
    expect(injected).toContain('CHEMISTRY');
    expect(injected).toContain(CHEMISTRY_DIAGRAM_REQUIREMENT.slice(0, 30));
    expect(injected).toContain('mhchem');

    const thread = document.getElementById('thread')!;
    const msg = document.createElement('model-response');
    const codeBlock = document.createElement('code-block');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = CHEM_CAPSULE_BODY;
    pre.appendChild(code);
    codeBlock.appendChild(pre);
    msg.appendChild(codeBlock);
    thread.appendChild(msg);

    await wait(600);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Chemistry');
    expect(state.sessions[0]!.capsule.steps.length).toBeGreaterThanOrEqual(3);
    c.stopWatching();
  });
});
