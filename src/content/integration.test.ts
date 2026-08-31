import { describe, it, expect, beforeEach } from 'vitest';
import { StemController } from './controller';
import { geminiAdapter } from '@/src/platforms/gemini';
import { useStore } from '@/src/state/store';
import { FENCED_CHEMISTRY, FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { buildComposerAppendix, PROTOCOL_FILENAME } from '@/src/protocol/builder';
import {
  HOST_FIXTURES,
  addNamedChip,
  mountHostComposer,
  pushAssistantCapsule as pushHostCapsule,
  wireProtocolAttach,
} from '@/src/platforms/host-fixtures';

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

function addProtocolChip(root: Element) {
  if (root.querySelector('.attachment-chip')) return;
  const chip = document.createElement('div');
  chip.className = 'attachment-chip';
  chip.textContent = PROTOCOL_FILENAME;
  root.appendChild(chip);
}

function mountGeminiComposer(opt: { protocolChip?: boolean } = {}) {
  document.body.innerHTML = `
    <input-area-v2>
      <images-files-uploader>
        <input type="file" />
      </images-files-uploader>
      <rich-textarea>
        <div class="ql-editor" contenteditable="true" role="textbox"></div>
      </rich-textarea>
    </input-area-v2>
    <button aria-label="Send message">Send</button>
    <div id="thread"></div>
  `;
  const uploader = document.querySelector('images-files-uploader')!;
  const input = uploader.querySelector('input[type="file"]')!;
  if (opt.protocolChip !== false) {
    uploader.addEventListener('drop', () => addProtocolChip(uploader));
    input.addEventListener('change', () => addProtocolChip(uploader));
  }
}

function pushAssistantCapsule(raw: string) {
  const thread = document.getElementById('thread')!;
  const msg = document.createElement('model-response');
  const codeBlock = document.createElement('code-block');
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = raw;
  pre.appendChild(code);
  codeBlock.appendChild(pre);
  msg.appendChild(codeBlock);
  thread.appendChild(msg);
}

/**
 * End-to-end through the REAL Gemini adapter against a simulated page DOM:
 * type a question -> attach stemlm-protocol.txt + short stub -> assistant replies ->
 * MutationObserver captures -> store holds a parsed session.
 */
describe('integration: Gemini adapter + controller capture', () => {
  beforeEach(() => {
    resetStore();
    mountGeminiComposer();
  });

  it('attaches the protocol file beside the question, then captures the answer', async () => {
    const editor = geminiAdapter.findEditor()!;
    editor.textContent =
      'Find the current in this 12V series resistor circuit (Kirchhoff).';

    const c = new StemController(geminiAdapter);
    const ok = await c.inject();
    expect(ok).toBe(true);

    const injected = geminiAdapter.getEditorText();
    expect(injected).toContain('12V series resistor');
    expect(injected).toContain(PROTOCOL_FILENAME);
    expect(injected).toContain('Follow the attached');
    expect(injected).not.toContain('OUTPUT:');
    expect(injected).not.toContain('--- stemLM instructions');
    expect(document.body.textContent).toContain(PROTOCOL_FILENAME);
    expect(useStore.getState().status).toBe('loading');

    pushAssistantCapsule(CAPSULE_BODY);
    await wait(600);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.status).toBe('ready');
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Electrical');
    expect(state.sessions[0]!.capsule.steps.length).toBeGreaterThanOrEqual(2);
    expect(state.sessions[0]!.platform).toBe('gemini');
    c.stopWatching();
  });

  it('keeps the composer short when the native input confirms attachment before a preview appears', async () => {
    mountGeminiComposer({ protocolChip: false });
    const editor = geminiAdapter.findEditor()!;
    const question = 'Find the current in this resistor circuit.';
    editor.textContent = question;

    const c = new StemController(geminiAdapter);
    expect(await c.inject()).toBe(true);

    const injected = geminiAdapter.getEditorText();
    const normalizeShort = (text: string) => text.replace(/\u00a0/g, '').replace(/\n+/g, '\n\n').trim();
    expect(normalizeShort(injected)).toBe(
      normalizeShort(`${question}\n\n${buildComposerAppendix({ hasQuestion: true })}`),
    );
    expect(injected).toContain(question);
    expect(injected).toContain('--- stemLM ---');
    expect(injected).toContain('Follow the attached stemlm-protocol.txt');
    expect(injected).not.toContain('--- stemLM instructions');
    expect(injected).not.toContain('OUTPUT:');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input?.files?.[0]?.name).toBe(PROTOCOL_FILENAME);
    c.stopWatching();
  });

  it('captures complete capsules even when a stop (streaming) button is present', async () => {
    const c = new StemController(geminiAdapter);
    c.startWatching();

    document.body.insertAdjacentHTML(
      'beforeend',
      '<button aria-label="Stop response">Stop</button>',
    );
    pushAssistantCapsule(CAPSULE_BODY);

    await wait(600);
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();
  });

  it('attaches chemistry protocol and captures AI-generated capsule', async () => {
    const editor = geminiAdapter.findEditor()!;
    editor.textContent =
      'Balance $\\ce{H2 + O2 -> H2O}$ and find moles of water from 2 mol $\\ce{H2}$.';

    const c = new StemController(geminiAdapter);
    const ok = await c.inject();
    expect(ok).toBe(true);

    const injected = geminiAdapter.getEditorText();
    expect(injected).toContain('Infer the subject from the problem');
    expect(injected).not.toContain('(Chemistry)');
    expect(injected).toContain(PROTOCOL_FILENAME);
    expect(injected).not.toContain('OUTPUT:');
    expect(injected).not.toContain('mhchem');

    pushAssistantCapsule(CHEM_CAPSULE_BODY);
    await wait(600);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Chemistry');
    expect(state.sessions[0]!.capsule.steps.length).toBeGreaterThanOrEqual(3);
    c.stopWatching();
  });
});

describe.each(HOST_FIXTURES)(
  'integration: $id inject attaches protocol file + stub then captures',
  (spec) => {
    beforeEach(() => {
      resetStore();
      const { composer } = mountHostComposer(spec, { capsule: false });
      wireProtocolAttach(composer);
    });

    it('keeps the typed question and image/PDF chip, attaches stemlm-protocol.txt, writes only the short stub, then captures a capsule tagged with that platform', async () => {
      const editor = spec.adapter.findEditor()!;
      if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        (editor as HTMLTextAreaElement).value =
          'Find the current in this 12V series resistor circuit (Kirchhoff).';
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        editor.textContent =
          'Find the current in this 12V series resistor circuit (Kirchhoff).';
      }
      addNamedChip(document, 'problem.png');

      const c = new StemController(spec.adapter);
      const ok = await c.inject();
      expect(ok).toBe(true);

      const injected = spec.adapter.getEditorText();
      expect(injected).toContain('12V series resistor');
      expect(injected).toContain(PROTOCOL_FILENAME);
      expect(injected).toContain('Follow the attached');
      expect(injected).not.toContain('OUTPUT:');
      expect(injected).not.toContain('--- stemLM instructions');
      expect(document.body.textContent).toContain(PROTOCOL_FILENAME);
      expect(document.body.textContent).toContain('problem.png');
      expect(spec.adapter.composerHasAttachments()).toBe(true);
      expect(useStore.getState().status).toBe('loading');

      pushHostCapsule(spec.id, CAPSULE_BODY);
      expect(spec.adapter.extractCapsules().join('\n')).toContain('@meta');
      await wait(600);

      const state = useStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.status).toBe('ready');
      expect(state.sessions[0]!.platform).toBe(spec.id);
      expect(state.sessions[0]!.capsule.meta.subject).toBe('Electrical');
      c.stopWatching();
    });
  },
);
