import { describe, it, expect, beforeEach } from 'vitest';
import { StemController } from './controller';
import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { useStore } from '@/src/state/store';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');

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
 * End-to-end through the REAL ChatGPT adapter against a simulated page DOM:
 * type a question -> inject -> assistant replies with a stemlm capsule ->
 * the MutationObserver captures it -> the store holds a parsed session.
 */
describe('integration: ChatGPT adapter + controller capture', () => {
  beforeEach(() => {
    resetStore();
    document.body.innerHTML = `
      <main>
        <form>
          <div id="prompt-textarea" class="ProseMirror" contenteditable="true"></div>
          <button data-testid="send-button">Send</button>
        </form>
      </main>
      <div id="thread"></div>
    `;
  });

  it('injects the prompt then captures the answer', async () => {
    // User types a question.
    const editor = chatgptAdapter.findEditor()!;
    editor.textContent = 'Find the current in this 12V series resistor circuit (Kirchhoff).';

    const c = new StemController(chatgptAdapter);
    const ok = c.inject('Auto');
    expect(ok).toBe(true);

    // The injected prompt keeps the question and adds the protocol + playbook.
    const injected = chatgptAdapter.getEditorText();
    expect(injected).toContain('12V series resistor');
    expect(injected).toContain('OUTPUT:');
    expect(injected).toContain('ELECTRICAL/CIRCUITS:');
    expect(useStore.getState().status).toBe('loading');

    // Assistant streams in its answer as a code block.
    const thread = document.getElementById('thread')!;
    const msg = document.createElement('div');
    msg.setAttribute('data-message-author-role', 'assistant');
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = CAPSULE_BODY;
    pre.appendChild(code);
    msg.appendChild(pre);
    thread.appendChild(msg);

    // Let the MutationObserver fire + debounce elapse.
    await wait(600);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.status).toBe('ready');
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Electrical');
    expect(state.sessions[0]!.capsule.steps.length).toBeGreaterThanOrEqual(2);
    expect(state.sessions[0]!.platform).toBe('chatgpt');
    c.stopWatching();
  });

  it('does not capture while the stop (streaming) button is present', async () => {
    const c = new StemController(chatgptAdapter);
    c.startWatching();

    // Simulate streaming: stop button + a partial (no @end) capsule.
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button data-testid="stop-button">Stop</button>',
    );
    const thread = document.getElementById('thread')!;
    thread.innerHTML =
      '<div data-message-author-role="assistant"><pre><code>@meta\nsubject: Physics\n@endmeta\n@step\ntitle: Start</code></pre></div>';
    await wait(600);
    expect(useStore.getState().sessions).toHaveLength(0);
    c.stopWatching();
  });
});
