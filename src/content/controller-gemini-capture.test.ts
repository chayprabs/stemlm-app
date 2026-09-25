import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { geminiAdapter } from '@/src/platforms/gemini';
import { useStore } from '@/src/state/store';
import { StemController } from './controller';

const body = FENCED_ELECTRICAL.replace(/^```stemlm\n/, '').replace(/\n```$/, '');
let controller: StemController;

function answer(text: string) {
  document.body.innerHTML = '<main><model-response><message-content><code-block><pre><code></code></pre></code-block></message-content></model-response></main>';
  document.querySelector('code')!.textContent = text;
}

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ sessions: [], activeSessionId: undefined, status: 'idle', errorMessage: undefined });
  controller = new StemController(geminiAdapter);
});
afterEach(() => {
  controller.stopWatching();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Gemini closing fence capture', () => {
  it('automatically captures the completed code snippet exactly once', async () => {
    answer(body + '```');
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(400);
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().status).toBe('ready');
    expect(await controller.loadConversation({ maxWaitMs: 0 })).toBe(1);
    expect(useStore.getState().sessions).toHaveLength(1);
  });

  it('loads a previously rejected answer from Gemini history', async () => {
    answer(body + '```');
    expect(controller.hasConversationToLoad()).toBe(true);
    expect(await controller.loadConversation({ maxWaitMs: 0 })).toBe(1);
    expect(useStore.getState().sessions[0]?.capsule.steps.length).toBeGreaterThan(0);
    expect(useStore.getState().errorMessage).toBeUndefined();
  });

  it('reports an unreadable response instead of claiming no answer exists', async () => {
    answer(body.replace(/@end$/, ''));
    expect(await controller.loadConversation({ maxWaitMs: 0 })).toBe(0);
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().errorMessage).toMatch(/incomplete|couldn't read/i);
    expect(useStore.getState().errorMessage).not.toMatch(/No stemLM answers/);
  });
});
