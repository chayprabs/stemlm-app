import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useStore } from '@/src/state/store';
import { EmptyState } from './EmptyState';

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    hasConversationToLoad: () => true,
    loadConversation: async () => 0,
  }),
}));

it('does not promise unloaded answers while the banner says this answer could not be read (UX-ERR-01)', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useStore.getState().setStatus('error', 'stemLM could not read this answer.\nParser code: missing_end.');
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<EmptyState />); });
    expect(container.textContent).not.toContain("aren't loaded yet");
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).toContain('Study workspace');
  } finally {
    act(() => root.unmount());
    useStore.getState().setStatus('idle');
  }
});
