import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    hasConversationToLoad: () => true,
    loadConversation: async () => 0,
  }),
}));

it('does not describe a detected but unreadable answer as absent', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<EmptyState />); });
    await act(async () => { container.querySelector('button')!.click(); });
    expect(container.textContent).not.toMatch(/No stemlm answers found/i);
    expect(container.textContent).toContain('could not be loaded');
  } finally { act(() => root.unmount()); }
});
