import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LOAD_FROM_CHAT_LABEL } from '@/src/lib/saved-library';

const { hasConversationToLoad, loadConversation } = vi.hoisted(() => ({
  hasConversationToLoad: vi.fn(() => false),
  loadConversation: vi.fn(async () => 2),
}));

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    hasConversationToLoad,
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
    expect(container.textContent).toContain('Type a question in the chat, then start stemLM.');
    expect(container.textContent).not.toContain(LOAD_FROM_CHAT_LABEL);
    unmount();
  });
});
