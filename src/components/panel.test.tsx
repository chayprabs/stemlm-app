import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';

const { saveSessionMock, deleteSavedSessionMock, isSessionSavedMock } = vi.hoisted(() => ({
  saveSessionMock: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSessionMock: vi.fn(async () => undefined),
  isSessionSavedMock: vi.fn(async () => false),
}));

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: saveSessionMock,
  deleteSavedSession: deleteSavedSessionMock,
  isSessionSaved: isSessionSavedMock,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  },
}));

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

beforeEach(() => {
  saveSessionMock.mockClear();
  deleteSavedSessionMock.mockClear();
  isSessionSavedMock.mockReset();
  isSessionSavedMock.mockResolvedValue(false);
});

afterEach(() => {
  useStore.getState().resetSessions();
});

describe('Panel step diagram', () => {
  it('shows the active step diagram inside the step card', async () => {
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
    expect(html).toContain('slm-step-diagram');
    expect(html).toContain('second-diagram');
    expect(html).not.toContain('first-diagram');
    expect(html).not.toContain('slm-diagram-well');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('shows Ask in chat on the last step even without a model @followup block', () => {
    const session = buildTwoDiagramSession();
    session.capsule.steps[1]!.followup = undefined;
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

    expect(container.querySelector('.slm-followup')).toBeTruthy();
    expect(container.textContent).toContain('Ask in chat');

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

describe('Panel save toggle', () => {
  it('saves on first click and unsaves on second click', async () => {
    const session = buildTwoDiagramSession();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;

    useStore.getState().resetSessions();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const saveBtn = container.querySelector(
      'button[aria-label="Save session"]',
    ) as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();

    await act(async () => {
      saveBtn.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(saveSessionMock).toHaveBeenCalledOnce();
    expect(container.querySelector('button[aria-label="Remove from saved sessions"]')).toBeTruthy();

    isSessionSavedMock.mockResolvedValue(true);
    const savedBtn = container.querySelector(
      'button[aria-label="Remove from saved sessions"]',
    ) as HTMLButtonElement;

    await act(async () => {
      savedBtn.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(deleteSavedSessionMock).toHaveBeenCalledOnce();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});

