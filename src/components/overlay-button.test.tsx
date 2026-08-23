import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';

const inject = vi.fn(async () => true);
const getLastQuestion = vi.fn(() => 'Old circuit question');

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject,
    getLastQuestion,
    resetInjection: vi.fn(),
  }),
}));

vi.mock('@/src/platforms/detect', () => ({
  detectAdapter: () => ({
    id: 'gemini',
    brand: { accent: '#4285f4', neutral: false },
    findEditor: () => document.getElementById('ed'),
    getEditorText: () => document.getElementById('ed')?.textContent ?? '',
    getComposerLeadingAnchor: () => null,
    getComposerShell: () => document.body,
    getComposerBox: () => document.body,
  }),
}));

vi.mock('@/src/lib/composer-slot', () => ({
  ensureComposerSlot: () => null,
  _composerSlotGap: 8,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('OverlayButton re-inject vs panel toggle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    inject.mockClear();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    const ed = document.createElement('div');
    ed.id = 'ed';
    document.body.appendChild(ed);
    useStore.setState({
      buttonInjected: true,
      panelOpen: false,
      status: 'ready',
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.getElementById('ed')?.remove();
  });

  it('injects a pointer when protocol is present and the question changed', async () => {
    getLastQuestion.mockReturnValue('Old circuit question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'New projectile question\n--- stemLM ---\nFollow the attached stemlm-protocol.txt';
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    await act(async () => {
      btn.click();
    });
    expect(inject).toHaveBeenCalled();
  });

  it('toggles the panel when the question is unchanged', async () => {
    getLastQuestion.mockReturnValue('Same question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'Same question\n--- stemLM ---\nFollow the attached stemlm-protocol.txt';
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(inject).not.toHaveBeenCalled();
    expect(useStore.getState().panelOpen).toBe(true);
  });
});
