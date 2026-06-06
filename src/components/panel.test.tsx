import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildTwoDiagramSession(): Session {
  return {
    id: 'panel-diagrams',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Show progressive diagrams',
    reviewedStepIds: [],
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Physics', topic: 'Progressive diagrams' },
      solution: 'Done.',
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 0,
          title: 'First visual state',
          body: 'First.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">first-diagram</text></svg>',
          },
        },
        {
          id: 's2',
          index: 1,
          title: 'Second visual state',
          body: 'Second.',
          diagram: {
            type: 'svg',
            content: '<svg viewBox="0 0 20 20"><text x="1" y="10">second-diagram</text></svg>',
          },
        },
      ],
    },
  };
}

afterEach(() => {
  useStore.getState().resetSessions();
});

describe('Panel diagram well', () => {
  it('shows the active step diagram instead of the first session diagram', async () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.getState().setActiveStep(1);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const html = container.innerHTML;
    expect(html).toContain('second-diagram');
    expect(html).not.toContain('first-diagram');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('keeps the question in the header when the active step changes', () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.getState().setActiveStep(0);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    expect(container.querySelector('.slm-topic')?.textContent).toBe('Show progressive diagrams');

    act(() => {
      useStore.getState().setActiveStep(1);
    });

    expect(container.querySelector('.slm-topic')?.textContent).toBe('Show progressive diagrams');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('moves one step per arrow key press', () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      activeStepIndex: 0,
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    panel.focus();

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
    });
    expect(useStore.getState().activeStepIndex).toBe(0);

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});

