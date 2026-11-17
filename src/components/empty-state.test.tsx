import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LOAD_FROM_CHAT_LABEL } from '@/src/lib/saved-library';
import { useStore } from '@/src/state/store';

const { hasConversationToLoad, plainAnswer, loadConversation } = vi.hoisted(() => ({
  hasConversationToLoad: vi.fn(() => false),
  plainAnswer: vi.fn(() => false),
  loadConversation: vi.fn(async () => 2),
}));

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    hasConversationToLoad,
    // The panel asks what kind of thing the chat holds: stemlm answers win over a plain one.
    conversationToLoad: () => (hasConversationToLoad() ? 'capsules' : plainAnswer() ? 'answer' : null),
    loadConversation,
  }),
}));

import { EmptyState } from './EmptyState';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<EmptyState />);
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
  hasConversationToLoad.mockReset();
  hasConversationToLoad.mockReturnValue(false);
  plainAnswer.mockReset();
  plainAnswer.mockReturnValue(false);
  loadConversation.mockReset();
  loadConversation.mockResolvedValue(2);
});

describe('EmptyState', () => {
  it('offers to load this chat when stemLM answers exist and are not loaded', async () => {
    hasConversationToLoad.mockReturnValue(true);
    const { container, unmount } = mount();
    expect(container.textContent).toContain("aren't loaded yet");
    expect(container.textContent).toContain(LOAD_FROM_CHAT_LABEL);
    const btn = [...container.querySelectorAll('button')].find((el) =>
      el.textContent?.includes(LOAD_FROM_CHAT_LABEL),
    ) as HTMLButtonElement;
    await act(async () => {
      btn.click();
      await Promise.resolve();
    });
    expect(loadConversation).toHaveBeenCalledOnce();
    unmount();
  });

  it('does not show the load CTA when this chat has nothing to load', () => {
    hasConversationToLoad.mockReturnValue(false);
    const { container, unmount } = mount();
    expect(container.textContent).toContain('Type a question in the chat, then start stemlm.');
    expect(container.textContent).not.toContain(LOAD_FROM_CHAT_LABEL);
    unmount();
  });
});

describe('EmptyState on a chat that was answered without stemlm', () => {
  const studyButton = (container: HTMLElement) =>
    [...container.querySelectorAll('button')].find((el) => el.textContent?.includes('Study the latest answer'));

  it('offers to study the latest answer, beside the usual way in', async () => {
    plainAnswer.mockReturnValue(true);
    const { container, unmount } = mount();
    const button = studyButton(container) as HTMLButtonElement;
    expect(button).toBeDefined();
    // The primary action of the view: solid ink, like every primary button in the panel.
    expect(button.className).toContain('slm-btn-soft');
    expect(container.textContent).toContain('Type a question in the chat, then start stemlm.');
    expect(container.querySelectorAll('.slm-empty-step')).toHaveLength(3);
    expect(container.textContent).not.toContain(LOAD_FROM_CHAT_LABEL);
    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    expect(loadConversation).toHaveBeenCalledOnce();
    unmount();
  });

  it('says the answer is arranged, not checked, before the student opens it', () => {
    plainAnswer.mockReturnValue(true);
    const { container, unmount } = mount();
    expect(container.textContent).toMatch(/does not check it/);
    expect(container.textContent).not.toMatch(/verif/i);
    unmount();
  });

  it('prefers stemlm answers when the chat has both', () => {
    hasConversationToLoad.mockReturnValue(true);
    plainAnswer.mockReturnValue(true);
    const { container, unmount } = mount();
    expect(container.textContent).toContain(LOAD_FROM_CHAT_LABEL);
    expect(studyButton(container)).toBeUndefined();
    unmount();
  });

  it('still offers the answer under an error banner about another reply', () => {
    plainAnswer.mockReturnValue(true);
    useStore.getState().setStatus('error', 'This reply has no stemlm answer.');
    try {
      const { container, unmount } = mount();
      expect(studyButton(container)).toBeDefined();
      unmount();
    } finally {
      useStore.getState().setStatus('idle');
    }
  });

  it('picks up an answer that finishes while the empty panel is open', () => {
    vi.useFakeTimers();
    try {
      const { container, unmount } = mount();
      expect(studyButton(container)).toBeUndefined();
      plainAnswer.mockReturnValue(true);
      act(() => {
        vi.advanceTimersByTime(1_600);
      });
      expect(studyButton(container)).toBeDefined();
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops looking at the chat once it is unmounted', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = mount();
      unmount();
      plainAnswer.mockClear();
      vi.advanceTimersByTime(10_000);
      expect(plainAnswer).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
