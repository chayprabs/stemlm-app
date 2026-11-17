import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initController } from './controller';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { HOST_FIXTURES, addNamedChip, mountHostComposer } from '@/src/platforms/host-fixtures';

vi.mock('@/src/lib/file-inject', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/file-inject')>()),
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' as const })),
}));

const claude = HOST_FIXTURES.find((spec) => spec.id === 'claude')!;

// happy-dom reports DOM changes on a real timer, which a busy machine delays: move the fake clock on
// in steps until the controller has seen the change, instead of one jump that can come first.
const settles = (check: () => void) => vi.waitFor(check, { timeout: 5000, interval: 50 });

// Live Claude 2026-09-27: removing the guide chip with the host's own × left the + saying "stemlm guide
// attached" and the panel waiting on "Reading response" for an answer that could not come.
describe('the student removes the attached guide before sending', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mountHostComposer(claude, { capsule: false });
    useStore.setState({ sessions: [], buttonInjected: false, status: 'idle', errorMessage: undefined, settings: DEFAULT_SETTINGS });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  async function injectWithChip() {
    const editor = claude.adapter.findEditor()!;
    editor.textContent = 'Find the current through the 4 ohm resistor.';
    const controller = initController(claude.adapter);
    const injected = controller.inject();
    await vi.advanceTimersByTimeAsync(300);
    expect(await injected).toBe(true);
    const composer = document.querySelector('fieldset, form')!;
    const chip = addNamedChip(composer, 'stemLM Guide.txt');
    await settles(() => expect(useStore.getState().buttonInjected).toBe(true));
    return { controller, chip };
  }

  it('goes back to "attach" and says why', async () => {
    const { controller, chip } = await injectWithChip();
    chip.remove();
    await settles(() => expect(useStore.getState().buttonInjected).toBe(false));
    const state = useStore.getState();
    console.log('GUIDE_REMOVED', JSON.stringify({ injected: state.buttonInjected, status: state.status, message: state.errorMessage }));
    expect(state.buttonInjected).toBe(false);
    expect(state.status).toBe('idle');
    expect(state.errorMessage).toMatch(/removed/i);
    // The message names the control to press, as it is drawn now: the stemlm button, not a plus.
    expect(state.errorMessage).toMatch(/\bstemlm button\b/);
    expect(state.errorMessage).not.toMatch(/\+/);
    controller.stopWatching();
  });

  it('keeps waiting when the chip left because the question was sent', async () => {
    const { controller, chip } = await injectWithChip();
    // Sent: the chip and the draft leave the chat box and become the student's message.
    const editor = claude.adapter.findEditor()!;
    const sent = Object.assign(document.createElement('div'), { textContent: editor.textContent });
    sent.setAttribute('data-testid', 'user-message');
    chip.remove();
    editor.textContent = '';
    document.getElementById('thread')!.append(sent);
    await settles(() => expect(useStore.getState().status).toBe('loading'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(useStore.getState().errorMessage ?? '').not.toMatch(/removed/i);
    expect(useStore.getState().status).toBe('loading');
    controller.stopWatching();
  });
});
