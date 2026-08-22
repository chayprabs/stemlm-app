import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import { applyTheme } from '@/src/lib/theme';
import type { Session } from '@/src/protocol/types';

const { saveSessionMock, deleteSavedSessionMock, isSessionSavedMock, refreshSavedSessionMock, setSettingsMock, exportSessionPdfMock } =
  vi.hoisted(() => ({
    saveSessionMock: vi.fn(async () => ({ prunedCount: 0 })),
    deleteSavedSessionMock: vi.fn(async () => undefined),
    isSessionSavedMock: vi.fn(async () => false),
    refreshSavedSessionMock: vi.fn(async () => false),
    setSettingsMock: vi.fn(async (patch: Record<string, unknown>) => ({
      theme: 'auto',
      shareAcrossTabs: false,
      autoOpenOnAnswer: true,
      promptVariant: 'balanced',
      analyticsOptOut: false,
      splitRatio: 0.5,
      ...patch,
    })),
    exportSessionPdfMock: vi.fn(async () => ({ ok: true, method: 'print' as const })),
  }));

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: saveSessionMock,
  deleteSavedSession: deleteSavedSessionMock,
  isSessionSaved: isSessionSavedMock,
  refreshSavedSession: refreshSavedSessionMock,
}));

vi.mock('@/src/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/settings')>();
  return { ...actual, setSettings: setSettingsMock };
});

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf: exportSessionPdfMock,
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

const SCRATCH = resolve(
  process.env.SLM_SCRATCH || 'C:\\Users\\chait\\AppData\\Local\\Temp\\grok-goal-6889acceb8d4\\implementer',
);
const TOKENS_CSS = readFileSync(resolve(process.cwd(), 'assets/tokens.css'), 'utf8');
const PANEL_CSS = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');

function installShippedStyles() {
  let style = document.getElementById('slm-shipped-styles') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'slm-shipped-styles';
    document.head.appendChild(style);
  }
  style.textContent = `${TOKENS_CSS}\n${PANEL_CSS}`;
}

function cssVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function mountPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<Panel />);
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

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function buildStudySession(): Session {
  const session = buildTwoDiagramSession();
  session.id = 'panel-study';
  session.capsule.steps[0] = {
    ...session.capsule.steps[0]!,
    body: 'Newton second law relates force to acceleration.',
    formula: '$$F = ma$$',
    takeaway: 'Force is mass times acceleration.',
    quickCheck: { question: 'What does F equal?', answer: 'mass times acceleration' },
    followup: 'Why is force a vector?',
  };
  session.capsule.solution = 'The net force equals mass times acceleration.';
  return session;
}

beforeEach(() => {
  saveSessionMock.mockClear();
  deleteSavedSessionMock.mockClear();
  isSessionSavedMock.mockReset();
  isSessionSavedMock.mockResolvedValue(false);
  refreshSavedSessionMock.mockReset();
  refreshSavedSessionMock.mockResolvedValue(false);
  setSettingsMock.mockClear();
  exportSessionPdfMock.mockClear();
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    errorMessage: undefined,
    view: 'steps',
    theme: 'light',
    splitRatio: 0.5,
    splitDragging: false,
    sessions: [],
    activeSessionId: undefined,
    activeStepIndex: 0,
  });
});

afterEach(() => {
  useStore.getState().resetSessions();
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    errorMessage: undefined,
    view: 'steps',
    theme: 'light',
    splitRatio: 0.5,
  });
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

  it('renders LaTeX vectors in the panel question heading', () => {
    const session = buildTwoDiagramSession();
    session.question =
      'Q.5 Three vectors \\vec{P}, \\vec{Q} and \\vec{R} are shown in the figure. Let S be any point on the vector \\vec{R}.';
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
    });

    act(() => {
      root = createRoot(container);
      root.render(<Panel />);
    });

    const topic = container.querySelector('.slm-topic');
    expect(topic?.textContent).toContain('Three vectors');
    expect(container.querySelector('.slm-topic .katex')).toBeTruthy();
    expect(container.querySelector('.slm-topic .katex-mathml')).toBeTruthy();

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
    expect(saveSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        question: session.question,
        capsule: expect.objectContaining({ solution: session.capsule.solution }),
      }),
    );
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

  it('refreshes an already-saved session when the capsule updates', async () => {
    isSessionSavedMock.mockResolvedValue(true);
    refreshSavedSessionMock.mockResolvedValue(true);

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

    expect(refreshSavedSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        capsule: expect.objectContaining({ solution: 'Done.' }),
      }),
    );

    const updated = {
      ...session,
      updatedAt: 99,
      capsule: { ...session.capsule, solution: 'The latest closed-form answer.' },
    };
    act(() => {
      useStore.setState({ sessions: [updated], activeSessionId: updated.id });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refreshSavedSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session.id,
        capsule: expect.objectContaining({ solution: 'The latest closed-form answer.' }),
      }),
    );

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});

describe('Panel empty / loading / banner states', () => {
  it('renders empty copy when there is no session', () => {
    useStore.setState({ panelOpen: true, status: 'idle' });
    const { container, unmount } = mountPanel();

    const panel = container.querySelector('[role="complementary"]');
    expect(panel?.getAttribute('aria-label')).toBe('stemLM study panel');
    expect(container.textContent).toContain('Study workspace');
    expect(container.textContent).toContain('Type a question in the chat, then tap stemLM beside send.');
    expect(container.textContent).toContain('Load from conversation');
    expect(container.querySelector('.slm-empty')).toBeTruthy();
    unmount();
  });

  it('renders loading copy when status is loading and there is no session', () => {
    useStore.setState({ panelOpen: true, status: 'loading' });
    const { container, unmount } = mountPanel();

    expect(container.textContent).toContain('Reading response');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Reading response');
    expect(container.querySelector('.slm-loading')).toBeTruthy();
    expect(container.textContent).not.toContain('Study workspace');
    unmount();
  });

  it('renders an error banner as an alert', () => {
    useStore.setState({
      panelOpen: true,
      status: 'error',
      errorMessage: 'Could not parse this answer.',
    });
    const { container, unmount } = mountPanel();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not parse this answer.');
    expect(container.textContent).toContain('Study workspace');
    unmount();
  });

  it('renders an info banner as status', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      errorMessage: 'Saved. Removed 1 older save to free storage.',
    });
    const { container, unmount } = mountPanel();

    const status = [...container.querySelectorAll('[role="status"]')].find((el) =>
      el.textContent?.includes('Removed 1 older save'),
    );
    expect(status).toBeTruthy();
    unmount();
  });
});

describe('Panel ready session', () => {
  it('shows question, step content, and switches Steps/Solution', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel.getAttribute('aria-label')).toBe('stemLM study panel');
    expect(container.querySelector('.slm-topic')?.textContent).toContain('Show progressive diagrams');
    expect(container.querySelector('.slm-question-icon')?.textContent).toMatch(/Q\./);
    expect(container.querySelector('.slm-question-icon')?.innerHTML).not.toContain('<svg');
    expect(container.querySelector('.slm-question-icon')?.innerHTML).not.toContain('M9.09 9');
    const header = container.querySelector('.slm-header') as HTMLElement;
    const tabsEl = header.querySelector('.slm-tabs') as HTMLElement;
    const questionEl = header.querySelector('.slm-topic') as HTMLElement;
    expect(tabsEl.compareDocumentPosition(questionEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.slm-step-badge')).toBeNull();
    expect(container.querySelector('.slm-card-head')?.textContent).not.toMatch(/\b0\d\b/);
    expect(container.querySelector('.slm-stepnav-count')).toBeNull();
    expect(container.textContent).not.toMatch(/\b1\s*\/\s*[0-9]+\b/);
    expect(container.querySelector('.slm-stepnav--overlay')).toBeTruthy();
    expect(container.querySelector('.slm-steps-layout')).toBeTruthy();
    expect(container.querySelector('.slm-step-rail')).toBeTruthy();
    expect(container.querySelector('.slm-read')).toBeTruthy();
    expect(container.querySelector('.slm-subject-chip')).toBeNull();
    expect(container.textContent).not.toMatch(/\bPhysics\b/);
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.textContent).toContain('Force is mass times acceleration.');
    expect(container.textContent).toContain('What does F equal?');
    expect(container.textContent).toContain('Why is force a vector?');
    expect(container.innerHTML).toContain('first-diagram');
    expect(container.querySelector('.slm-step-diagram')).toBeTruthy();

    const next = container.querySelector('button[aria-label="Next step"]') as HTMLButtonElement;
    const prev = container.querySelector('button[aria-label="Previous step"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    act(() => {
      next.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(container.textContent).toContain('Second visual state');
    expect(container.querySelector('.slm-card-title')?.textContent).toBe('Second visual state');
    expect(container.innerHTML).toContain('second-diagram');
    act(() => {
      prev.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(0);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });

    const solutionTab = container.querySelector('#slm-tab-solution') as HTMLButtonElement;
    act(() => {
      solutionTab.click();
    });
    expect(useStore.getState().view).toBe('solution');
    expect(container.querySelector('#slm-panel-solution')).toBeTruthy();
    expect(container.textContent).not.toContain('Step-by-step');
    expect(container.querySelector('.slm-solution-q')).toBeNull();
    expect(container.querySelector('.slm-solution-step-head .slm-step-index')).toBeTruthy();
    expect(container.textContent).not.toContain('Full solution');
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.textContent).not.toContain('The net force equals mass times acceleration.');
    expect(container.querySelector('#slm-panel-steps')).toBeNull();

    const stepsTab = container.querySelector('#slm-tab-steps') as HTMLButtonElement;
    act(() => {
      stepsTab.click();
    });
    expect(useStore.getState().view).toBe('steps');
    expect(container.querySelector('#slm-panel-steps')).toBeTruthy();
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).not.toContain('Mark reviewed');
    expect(container.textContent).not.toMatch(/reviewed/i);

    unmount();
  });

  it('fires save, PDF, theme, and close from the header', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const saveBtn = container.querySelector('button[aria-label="Save session"]') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
      await Promise.resolve();
    });
    expect(saveSessionMock).toHaveBeenCalledOnce();

    const pdfBtn = container.querySelector('button[aria-label="Export PDF"]') as HTMLButtonElement;
    expect(pdfBtn.innerHTML).toContain('M15 2H6');
    expect(pdfBtn.innerHTML).not.toContain('M6.4 20.4h11.2');
    await act(async () => {
      pdfBtn.click();
      await Promise.resolve();
    });
    expect(exportSessionPdfMock).toHaveBeenCalledOnce();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });
    expect(useStore.getState().theme).toBe('dark');
    expect(setSettingsMock).toHaveBeenCalled();

    const closeBtn = container.querySelector('button[aria-label="Close panel"]') as HTMLButtonElement;
    act(() => {
      closeBtn.click();
    });
    expect(useStore.getState().panelOpen).toBe(false);

    unmount();
  });

  it('keeps the step rail as index tiles without titles or a connector', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const rail = container.querySelector('.slm-step-rail') as HTMLElement;
    expect(rail).toBeTruthy();
    expect(rail.querySelector('.slm-step-rail-label')).toBeNull();
    expect(rail.textContent?.includes('First visual state')).toBe(false);
    expect(rail.querySelectorAll('.slm-step-index')).toHaveLength(2);

    const buttons = [...rail.querySelectorAll<HTMLButtonElement>('.slm-step-rail-btn')];
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Step 1: First visual state');
    expect(buttons[1]?.getAttribute('aria-label')).toBe('Step 2: Second visual state');
    expect(getComputedStyle(buttons[0]!).borderRadius).not.toBe('50%');

    act(() => {
      buttons[1]!.click();
    });
    expect(useStore.getState().activeStepIndex).toBe(1);
    expect(buttons[1]?.getAttribute('aria-current')).toBe('step');

    unmount();
  });

  it('uses one morphing theme glyph and a bookmark save that fills when active', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    expect(themeBtn.classList.contains('slm-theme-btn')).toBe(true);
    expect(themeBtn.classList.contains('is-dark')).toBe(false);
    expect(themeBtn.querySelector('.slm-theme-glyph')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-disc')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-crescent')).toBeTruthy();
    expect(themeBtn.querySelector('.slm-theme-rays')).toBeTruthy();
    expect(container.querySelectorAll('.slm-theme-glyph')).toHaveLength(1);

    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });

    const darkBtn = container.querySelector(
      'button[aria-label="Switch to light theme"]',
    ) as HTMLButtonElement;
    expect(darkBtn.classList.contains('is-dark')).toBe(true);
    expect(darkBtn.querySelector('.slm-theme-glyph')).toBeTruthy();
    expect(container.querySelectorAll('.slm-theme-glyph')).toHaveLength(1);

    const saveBtn = container.querySelector(
      'button[aria-label="Save session"]',
    ) as HTMLButtonElement;
    expect(saveBtn.querySelector('.slm-icon-save')).toBeTruthy();
    expect(saveBtn.getAttribute('data-active')).toBeNull();
    expect(saveBtn.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      saveBtn.click();
      await Promise.resolve();
    });

    const savedBtn = container.querySelector(
      'button[aria-label="Remove from saved sessions"]',
    ) as HTMLButtonElement;
    expect(savedBtn.getAttribute('data-active')).toBe('true');
    expect(savedBtn.getAttribute('aria-pressed')).toBe('true');
    expect(savedBtn.querySelector('.slm-icon-save')).toBeTruthy();
    expect(savedBtn.querySelector('.slm-save-glyph')).toBeTruthy();

    unmount();
  });

  it('closes on Escape and moves steps with arrow keys', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      theme: 'light',
      activeStepIndex: 0,
    });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    panel.focus();

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().activeStepIndex).toBe(1);

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().activeStepIndex).toBe(0);

    act(() => {
      panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(useStore.getState().panelOpen).toBe(false);

    unmount();
  });

  it('switches between multiple sessions', () => {
    const first = buildStudySession();
    const second = buildStudySession();
    second.id = 'panel-study-2';
    second.question = 'A different question';
    second.capsule = {
      ...second.capsule,
      meta: { ...second.capsule.meta, topic: 'Other topic' },
    };
    useStore.getState().addSession(first);
    useStore.getState().addSession(second);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();

    const pills = container.querySelectorAll('.slm-session-pill');
    expect(pills).toHaveLength(2);
    expect(container.querySelector('.slm-topic')?.textContent).toContain('A different question');

    act(() => {
      (pills[0] as HTMLButtonElement).click();
    });
    expect(useStore.getState().activeSessionId).toBe(first.id);
    expect(container.querySelector('.slm-topic')?.textContent).toContain('Show progressive diagrams');

    unmount();
  });
});

describe('Panel theme, split, and width density', () => {
  beforeEach(() => {
    installShippedStyles();
  });

  it('applies light then dark through the real theme path', async () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(panel.getAttribute('data-stemlm-theme')).toBe('light');
    applyTheme(panel, 'light');
    const lightBg = cssVar(panel, '--slm-bg');
    const lightFg = cssVar(panel, '--slm-fg');
    expect(lightBg).toBeTruthy();
    expect(lightFg).toBeTruthy();

    const themeBtn = container.querySelector(
      'button[aria-label="Switch to dark theme"]',
    ) as HTMLButtonElement;
    await act(async () => {
      themeBtn.click();
      await Promise.resolve();
    });

    expect(useStore.getState().theme).toBe('dark');
    expect(panel.getAttribute('data-stemlm-theme')).toBe('dark');
    applyTheme(panel, 'dark');
    const darkBg = cssVar(panel, '--slm-bg');
    const darkFg = cssVar(panel, '--slm-fg');
    expect(darkBg).toBeTruthy();
    expect(darkFg).toBeTruthy();
    expect(darkBg).not.toBe(lightBg);
    expect(darkFg).not.toBe(lightFg);
    expect(panel.style.colorScheme).toBe('dark');

    unmount();
  });

  it('sizes the open panel from splitRatio', () => {
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({
      panelOpen: true,
      status: 'ready',
      view: 'steps',
      splitRatio: 0.37,
    });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(parseFloat(panel.style.width)).toBeCloseTo(37, 3);
    expect(panel.style.width.endsWith('vw')).toBe(true);
    unmount();
  });

  it('keeps step content visible in narrow and wide width bands', () => {
    type ROCb = ResizeObserverCallback;
    let roCb: ROCb | undefined;
    const PrevRO = globalThis.ResizeObserver;
    class FakeRO {
      constructor(cb: ROCb) {
        roCb = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 360 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('narrow');
    expect(container.textContent).toContain('First visual state');
    expect(container.textContent).toContain('Newton second law');
    expect(container.querySelector('.slm-read')?.textContent).toContain('First visual state');

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 720 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('wide');
    expect(container.textContent).toContain('First visual state');
    expect(container.querySelector('.slm-read')?.textContent).toContain('Newton second law');
    expect(container.querySelector('.slm-step-rail-label')).toBeNull();
    const stepBtn = container.querySelector(
      '.slm-step-rail-btn[aria-current="step"]',
    ) as HTMLButtonElement;
    expect(stepBtn.getAttribute('aria-label')).toContain('First visual state');
    expect(stepBtn.getAttribute('title')).toBe('First visual state');
    expect(container.querySelector('.slm-step-index')).toBeTruthy();
    expect(cssVar(panel, '--slm-rail-size')).not.toBe('13.25rem');
    expect(getComputedStyle(container.querySelector('.slm-brand-name') as HTMLElement).height).toBe(
      '25px',
    );

    globalThis.ResizeObserver = PrevRO;
    unmount();
  });

  it('sizes the header lockup at 25px, 22px when the panel is narrow', () => {
    type ROCb = ResizeObserverCallback;
    let roCb: ROCb | undefined;
    const PrevRO = globalThis.ResizeObserver;
    class FakeRO {
      constructor(cb: ROCb) {
        roCb = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = FakeRO as unknown as typeof ResizeObserver;

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps' });
    const { container, unmount } = mountPanel();
    const panel = container.querySelector('.slm-panel') as HTMLElement;
    const brand = () => container.querySelector('.slm-brand-name') as HTMLElement;

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 720 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('wide');
    expect(cssVar(panel, '--slm-brand-size')).toBe('25px');
    expect(getComputedStyle(brand()).height).toBe('25px');

    act(() => {
      roCb?.(
        [{ target: panel, contentRect: { width: 360 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(panel.dataset.width).toBe('narrow');
    expect(cssVar(panel, '--slm-brand-size')).toBe('22px');

    globalThis.ResizeObserver = PrevRO;
    unmount();
  });

  it('applies plex fonts, dark canvas, question scroll, and a rounded shell', async () => {
    installShippedStyles();
    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'dark' });
    const { container, unmount } = mountPanel();
    await flush();

    const panel = container.querySelector('.slm-panel') as HTMLElement;
    expect(cssVar(panel, '--font-sans')).toContain('IBM Plex Sans');
    expect(cssVar(panel, '--font-mono')).toContain('IBM Plex Mono');
    expect(cssVar(panel, '--slm-bg').toLowerCase()).toBe('#151515');
    expect(cssVar(panel, '--slm-formula-bg').toLowerCase()).toBe('#111111');
    expect(cssVar(panel, '--slm-fg').toLowerCase()).toBe('#ededed');
    expect(parseInt(cssVar(panel, '--slm-theme-duration'), 10)).toBeLessThanOrEqual(180);

    expect(container.querySelector('.slm-question-icon')?.textContent).toMatch(/Q\./);
    expect(container.querySelector('.slm-subject-chip')).toBeNull();
    const rail = container.querySelector('.slm-step-rail') as HTMLElement;
    const article = container.querySelector('.slm-read') as HTMLElement;
    expect(getComputedStyle(rail).overflowY).toBe('auto');
    expect(getComputedStyle(article).overflowY).toBe('auto');
    expect(PANEL_CSS).toMatch(/\.slm-step-rail\s*\{[\s\S]*scrollbar-width:\s*none/);
    const scroll = container.querySelector('.slm-topic-scroll') as HTMLElement;
    expect(scroll).toBeTruthy();
    expect(getComputedStyle(scroll).overflowY).toBe('auto');
    expect(getComputedStyle(scroll).maxHeight).not.toBe('none');
    expect(getComputedStyle(panel).borderRadius).not.toBe('0px');

    const pdfBtn = container.querySelector('button[aria-label="Export PDF"]') as HTMLButtonElement;
    expect(pdfBtn.innerHTML).toContain('M15 2H6');
    expect(pdfBtn.innerHTML).not.toContain('M6.4 20.4h11.2');

    unmount();
  });
});

describe('Panel html dumps', () => {
  function writeDump(name: string, innerHTML: string, theme: 'light' | 'dark') {
    mkdirSync(SCRATCH, { recursive: true });
    const markup = innerHTML.replaceAll('data-width="narrow"', 'data-width="mid"');
    const page = `<!doctype html>
<html data-stemlm-theme="${theme}">
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>
html, body { margin: 0; height: 100%; background: ${theme === 'dark' ? '#111113' : '#e8e8ea'}; }
${TOKENS_CSS}
${PANEL_CSS}
.slm-panel { position: relative !important; height: 100vh; width: 520px; max-width: 100%; margin-left: auto; transform: none !important; }
</style>
</head>
<body>${markup}</body>
</html>`;
    writeFileSync(resolve(SCRATCH, `${name}.html`), page, 'utf8');
  }

  it('writes empty, loading, ready-steps, and ready-solution dumps in light and dark', async () => {
    installShippedStyles();

    async function settle() {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 320));
      });
    }

    useStore.setState({ panelOpen: true, status: 'idle', theme: 'light' });
    let mounted = mountPanel();
    await settle();
    writeDump('panel-empty-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'idle', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-empty-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'loading', theme: 'light', sessions: [] });
    mounted = mountPanel();
    await settle();
    writeDump('panel-loading-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'loading', theme: 'dark', sessions: [] });
    mounted = mountPanel();
    await settle();
    writeDump('panel-loading-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    const session = buildStudySession();
    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    mounted = mountPanel();
    await settle();
    expect(mounted.container.innerHTML.length).toBeGreaterThan(200);
    writeDump('panel-ready-steps-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-steps-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'solution', theme: 'light' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-solution-light', mounted.container.innerHTML, 'light');
    mounted.unmount();

    useStore.setState({ panelOpen: true, status: 'ready', view: 'solution', theme: 'dark' });
    mounted = mountPanel();
    await settle();
    writeDump('panel-ready-solution-dark', mounted.container.innerHTML, 'dark');
    mounted.unmount();
  });
});

